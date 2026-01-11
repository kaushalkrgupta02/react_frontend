import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type PaymentIntentType = 'line_skip_pass' | 'package_purchase' | 'booking_deposit';
export type PaymentMethod = 'bca' | 'gopay' | 'card' | 'apple_pay' | 'google_pay';
export type PaymentStatus =
  | 'pending_processing'
  | 'pending_confirmation'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function createPaymentIntent(params: {
  userId: string;
  type: PaymentIntentType;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceId?: string | null;
  notes?: string | null;
  metadata?: Json;
}): Promise<{ id: string }>
{
  const {
    userId,
    type,
    amount,
    currency = 'IDR',
    method,
    status,
    referenceId = null,
    notes = null,
    metadata = {},
  } = params;

  const { data, error } = await supabase
    .from('payment_intents')
    .insert({
      user_id: userId,
      type,
      amount,
      currency,
      method,
      status,
      reference_id: referenceId,
      notes,
      metadata,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Failed to create payment intent');

  return { id: data.id };
}

export async function listPaymentIntents(params: { userId: string; limit?: number }) {
  const { userId, limit = 20 } = params;

  const { data, error } = await supabase
    .from('payment_intents')
    .select('id, created_at, type, amount, currency, method, status, notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
