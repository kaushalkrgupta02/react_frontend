import { supabase } from '@/integrations/supabase/client';

// Track when a booking outcome is recorded (show/no-show)
export async function trackBookingOutcome(
  bookingId: string,
  venueId: string,
  outcome: 'showed' | 'no_show' | 'cancelled',
  options?: {
    actualPartySize?: number;
    spendAmount?: number;
    feedbackRating?: number;
    feedbackText?: string;
  }
) {
  try {
    const { error } = await supabase.from('booking_outcomes').insert({
      booking_id: bookingId,
      venue_id: venueId,
      outcome,
      actual_party_size: options?.actualPartySize,
      spend_amount: options?.spendAmount,
      feedback_rating: options?.feedbackRating,
      feedback_text: options?.feedbackText,
      arrived_at: outcome === 'showed' ? new Date().toISOString() : null,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error tracking booking outcome:', error);
    return { success: false, error };
  }
}

// Track promo impressions (when a promo is viewed)
export async function trackPromoImpression(promoId: string, venueId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Try to upsert - increment impressions if exists, create if not
    const { data: existing } = await supabase
      .from('promo_analytics')
      .select('id, impressions')
      .eq('promo_id', promoId)
      .eq('recorded_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('promo_analytics')
        .update({ impressions: (existing.impressions || 0) + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('promo_analytics').insert({
        promo_id: promoId,
        venue_id: venueId,
        recorded_date: today,
        impressions: 1,
        clicks: 0,
        redemptions: 0,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking promo impression:', error);
    return { success: false, error };
  }
}

// Track promo clicks (when a promo is clicked/opened)
export async function trackPromoClick(promoId: string, venueId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
      .from('promo_analytics')
      .select('id, clicks')
      .eq('promo_id', promoId)
      .eq('recorded_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('promo_analytics')
        .update({ clicks: (existing.clicks || 0) + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('promo_analytics').insert({
        promo_id: promoId,
        venue_id: venueId,
        recorded_date: today,
        impressions: 0,
        clicks: 1,
        redemptions: 0,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking promo click:', error);
    return { success: false, error };
  }
}

// Track promo redemption (when a promo code is used)
export async function trackPromoRedemption(promoId: string, venueId?: string, revenueGenerated?: number) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Update promo_analytics
    const { data: existing } = await supabase
      .from('promo_analytics')
      .select('id, redemptions, revenue_generated')
      .eq('promo_id', promoId)
      .eq('recorded_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('promo_analytics')
        .update({ 
          redemptions: (existing.redemptions || 0) + 1,
          revenue_generated: (Number(existing.revenue_generated) || 0) + (revenueGenerated || 0),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('promo_analytics').insert({
        promo_id: promoId,
        venue_id: venueId,
        recorded_date: today,
        impressions: 0,
        clicks: 0,
        redemptions: 1,
        revenue_generated: revenueGenerated || 0,
      });
    }

    // Also increment current_redemptions on the promo itself
    const { data: promo } = await supabase
      .from('promos')
      .select('current_redemptions')
      .eq('id', promoId)
      .single();

    if (promo) {
      await supabase
        .from('promos')
        .update({ current_redemptions: (promo.current_redemptions || 0) + 1 })
        .eq('id', promoId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking promo redemption:', error);
    return { success: false, error };
  }
}

// Record venue analytics snapshot (typically called periodically or on events)
export async function recordVenueAnalytics(
  venueId: string,
  data: {
    capacityPercentage: number;
    footfallCount: number;
    revenueEstimate?: number;
    weatherCondition?: string;
  }
) {
  try {
    const now = new Date();
    
    const { error } = await supabase.from('venue_analytics').insert({
      venue_id: venueId,
      capacity_percentage: data.capacityPercentage,
      footfall_count: data.footfallCount,
      revenue_estimate: data.revenueEstimate || 0,
      day_of_week: now.getDay(),
      hour_of_day: now.getHours(),
      peak_hour_flag: now.getHours() >= 22 || now.getHours() <= 2,
      weather_condition: data.weatherCondition,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error recording venue analytics:', error);
    return { success: false, error };
  }
}
