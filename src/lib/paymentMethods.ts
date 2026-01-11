import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type PaymentMethodType = 'card' | 'bca' | 'gopay' | 'apple_pay' | 'google_pay';

export interface SavedPaymentMethod {
  id: string;
  created_at: string;
  type: PaymentMethodType;
  label: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  is_default: boolean;
}

export async function listPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, created_at, type, label, card_brand, card_last4, card_exp_month, card_exp_year, is_default')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SavedPaymentMethod[];
}

export async function createPaymentMethod(params: {
  userId: string;
  type: PaymentMethodType;
  label: string;
  cardBrand?: string | null;
  cardLast4?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  setDefault?: boolean;
  metadata?: Json;
}): Promise<{ id: string }> {
  const {
    userId,
    type,
    label,
    cardBrand = null,
    cardLast4 = null,
    cardExpMonth = null,
    cardExpYear = null,
    setDefault = false,
    metadata = {},
  } = params;

  if (setDefault) {
    // best-effort unset existing default
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('payment_methods')
    .insert({
      user_id: userId,
      type,
      label,
      card_brand: cardBrand,
      card_last4: cardLast4,
      card_exp_month: cardExpMonth,
      card_exp_year: cardExpYear,
      is_default: setDefault,
      metadata,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Failed to create payment method');

  return { id: data.id };
}

export async function deletePaymentMethod(params: { userId: string; methodId: string }): Promise<void> {
  const { userId, methodId } = params;
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', methodId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function setDefaultPaymentMethod(params: { userId: string; methodId: string }): Promise<void> {
  const { userId, methodId } = params;

  const { error: unsetError } = await supabase
    .from('payment_methods')
    .update({ is_default: false })
    .eq('user_id', userId);
  if (unsetError) throw unsetError;

  const { error: setError } = await supabase
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', methodId)
    .eq('user_id', userId);
  if (setError) throw setError;
}
