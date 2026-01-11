import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayoutRequest {
  action: "process_batch" | "mark_paid" | "get_summary";
  commissionIds?: string[];
  venueId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("Stripe");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, commissionIds, venueId }: PayoutRequest = await req.json();
    console.log(`Processing payout action: ${action}`);

    // Get summary of pending commissions
    if (action === "get_summary") {
      const { data: pendingCommissions, error } = await supabase
        .from("promo_commissions")
        .select(`
          id,
          amount,
          commission_amount,
          venue_id,
          created_at,
          venues (name, stripe_account_id, payout_enabled)
        `)
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching commissions:", error);
        throw error;
      }

      // Group by venue
      const byVenue: Record<string, {
        venueId: string;
        venueName: string;
        stripeAccountId: string | null;
        payoutEnabled: boolean;
        totalCommission: number;
        count: number;
        commissionIds: string[];
      }> = {};

      for (const c of pendingCommissions || []) {
        const vid = c.venue_id;
        const venueData = c.venues as unknown as { name: string; stripe_account_id: string | null; payout_enabled: boolean } | null;
        if (!byVenue[vid]) {
          byVenue[vid] = {
            venueId: vid,
            venueName: venueData?.name || "Unknown",
            stripeAccountId: venueData?.stripe_account_id || null,
            payoutEnabled: venueData?.payout_enabled || false,
            totalCommission: 0,
            count: 0,
            commissionIds: [],
          };
        }
        byVenue[vid].totalCommission += c.commission_amount || 0;
        byVenue[vid].count += 1;
        byVenue[vid].commissionIds.push(c.id);
      }

      const summary = Object.values(byVenue);
      const totalPending = summary.reduce((sum, v) => sum + v.totalCommission, 0);
      const totalCount = summary.reduce((sum, v) => sum + v.count, 0);

      console.log(`Summary: ${totalCount} commissions totaling ${totalPending}`);

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            totalPending,
            totalCount,
            byVenue: summary,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark commissions as paid (manual marking without Stripe transfer)
    if (action === "mark_paid") {
      if (!commissionIds || commissionIds.length === 0) {
        throw new Error("No commission IDs provided");
      }

      console.log(`Marking ${commissionIds.length} commissions as paid`);

      // Create a payout batch record
      const { data: batch, error: batchError } = await supabase
        .from("payout_batches")
        .insert({
          total_amount: 0, // Will be calculated
          commission_count: commissionIds.length,
          status: "completed",
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (batchError) {
        console.error("Error creating batch:", batchError);
        throw batchError;
      }

      // Update commissions to paid
      const { error: updateError } = await supabase
        .from("promo_commissions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payout_batch_id: batch.id,
        })
        .in("id", commissionIds);

      if (updateError) {
        console.error("Error updating commissions:", updateError);
        throw updateError;
      }

      // Calculate total and update batch
      const { data: paidCommissions } = await supabase
        .from("promo_commissions")
        .select("commission_amount")
        .in("id", commissionIds);

      const totalAmount = paidCommissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

      await supabase
        .from("payout_batches")
        .update({ total_amount: totalAmount })
        .eq("id", batch.id);

      console.log(`Batch ${batch.id} completed: ${commissionIds.length} commissions, ${totalAmount} total`);

      return new Response(
        JSON.stringify({
          success: true,
          batchId: batch.id,
          count: commissionIds.length,
          totalAmount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process batch payout via Stripe
    if (action === "process_batch") {
      if (!stripeKey) {
        console.error("Stripe key not configured");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Stripe not configured. Commissions marked as pending.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

      if (!venueId) {
        throw new Error("Venue ID required for batch processing");
      }

      // Get venue with Stripe account
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("id, name, stripe_account_id, payout_enabled")
        .eq("id", venueId)
        .single();

      if (venueError || !venue) {
        throw new Error("Venue not found");
      }

      if (!venue.payout_enabled || !venue.stripe_account_id) {
        console.log(`Venue ${venue.name} not configured for payouts`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Venue not configured for Stripe payouts",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Get pending commissions for this venue
      const { data: pendingCommissions, error: commError } = await supabase
        .from("promo_commissions")
        .select("id, commission_amount")
        .eq("venue_id", venueId)
        .eq("status", "pending");

      if (commError) throw commError;

      if (!pendingCommissions || pendingCommissions.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "No pending commissions for this venue",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalAmount = pendingCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      const commIds = pendingCommissions.map(c => c.id);

      console.log(`Processing Stripe transfer: ${totalAmount} to ${venue.stripe_account_id}`);

      // Create payout batch
      const { data: batch, error: batchError } = await supabase
        .from("payout_batches")
        .insert({
          total_amount: totalAmount,
          commission_count: commIds.length,
          status: "processing",
        })
        .select()
        .single();

      if (batchError) throw batchError;

      try {
        // Create Stripe transfer to connected account
        const transfer = await stripe.transfers.create({
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: "idr",
          destination: venue.stripe_account_id,
          description: `Nightly commission payout - Batch ${batch.id}`,
          metadata: {
            batch_id: batch.id,
            venue_id: venueId,
            commission_count: commIds.length.toString(),
          },
        });

        console.log(`Stripe transfer created: ${transfer.id}`);

        // Update commissions with transfer ID
        await supabase
          .from("promo_commissions")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payout_batch_id: batch.id,
            stripe_transfer_id: transfer.id,
          })
          .in("id", commIds);

        // Update batch as completed
        await supabase
          .from("payout_batches")
          .update({
            status: "completed",
            stripe_batch_id: transfer.id,
            processed_at: new Date().toISOString(),
          })
          .eq("id", batch.id);

        return new Response(
          JSON.stringify({
            success: true,
            transferId: transfer.id,
            batchId: batch.id,
            amount: totalAmount,
            count: commIds.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (stripeError: any) {
        console.error("Stripe error:", stripeError);

        // Update batch with error
        await supabase
          .from("payout_batches")
          .update({
            status: "failed",
            error_message: stripeError.message,
          })
          .eq("id", batch.id);

        return new Response(
          JSON.stringify({
            success: false,
            error: stripeError.message,
            batchId: batch.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error: any) {
    console.error("Error in process-commission-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
