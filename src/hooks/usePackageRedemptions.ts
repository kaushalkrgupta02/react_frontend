import { useState, useCallback } from 'react';
import { createPackageRedemptionsApi, getRedemptionsForPurchaseApi } from '@/lib/packagesPurchasesApi';

export interface PackageRedemption {
  id: string;
  purchase_id: string;
  package_item_id: string;
  quantity_redeemed: number;
  redeemed_by: string | null;
  redeemed_at: string;
  notes: string | null;
  created_at: string;
}

export function usePackageRedemptions() {
  const [isRedeeming, setIsRedeeming] = useState(false);

  const redeemItem = useCallback(async (
    purchaseId: string,
    packageItemId: string,
    quantityToRedeem: number = 1,
    notes?: string
  ): Promise<{ success: boolean; error?: string; data?: PackageRedemption }> => {
    setIsRedeeming(true);
    try {
      const payload = [{ package_item_id: packageItemId, quantity_redeemed: quantityToRedeem, notes: notes || null }];
      const data = await createPackageRedemptionsApi(purchaseId, payload);
      // backend recalculates purchase status; return success
      return { success: true, data: data as PackageRedemption };
    } catch (error: any) {
      console.error('Error redeeming item via API:', error);
      return { success: false, error: error.message };
    } finally {
      setIsRedeeming(false);
    }
  }, []);

  const redeemMultipleItems = useCallback(async (
    purchaseId: string,
    items: { packageItemId: string; quantity: number }[],
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsRedeeming(true);
    try {
      const payload = items.map(item => ({ package_item_id: item.packageItemId, quantity_redeemed: item.quantity, notes: notes || null }));
      await createPackageRedemptionsApi(purchaseId, payload);
      // backend will recalculate purchase status
      return { success: true };
    } catch (error: any) {
      console.error('Error redeeming items via API:', error);
      return { success: false, error: error.message };
    } finally {
      setIsRedeeming(false);
    }
  }, []);

  const getRedemptionsForPurchase = useCallback(async (
    purchaseId: string
  ): Promise<{ success: boolean; error?: string; data?: PackageRedemption[] }> => {
    try {
      const data = await getRedemptionsForPurchaseApi(purchaseId);
      return { success: true, data: data as PackageRedemption[] };
    } catch (error: any) {
      console.error('Error fetching redemptions via API:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    isRedeeming,
    redeemItem,
    redeemMultipleItems,
    getRedemptionsForPurchase,
  };
}

async function updatePurchaseStatusIfNeeded(purchaseId: string) {
  try {
    // Server recalculates purchase status after redemptions; no-op in frontend
    return;
  } catch (error) {
    console.error('Error in local status check:', error);
  }
}

