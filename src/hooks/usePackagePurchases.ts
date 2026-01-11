import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fetchVenuePurchasesViaApi, createPackagePurchaseApi, updatePackagePurchaseApi, findPurchaseByQrApi } from '@/lib/packagesPurchasesApi';

export type PurchaseStatus = 'active' | 'partially_redeemed' | 'fully_redeemed' | 'expired' | 'cancelled';

export interface PackagePurchase {
  id: string;
  package_id: string;
  user_id: string | null;
  venue_id: string;
  qr_code: string;
  status: PurchaseStatus;
  purchased_at: string;
  expires_at: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_count: number | null;
  total_paid: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  package?: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    package_type: string | null;
  };
  profile?: {
    display_name: string | null;
    phone: string | null;
  };
}

export interface PackagePurchaseWithItems extends PackagePurchase {
  items: {
    id: string;
    item_type: string;
    item_name: string;
    quantity: number;
    redemption_rule: string;
    redeemed_count: number;
  }[];
}

function generateQRCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PKG-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface UsePackagePurchasesOptions {
  startDate?: Date;
  endDate?: Date;
  preset?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
}

export function usePackagePurchases(venueId: string | null, options?: UsePackagePurchasesOptions) {
  const [purchases, setPurchases] = useState<PackagePurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const startDateStr = options?.startDate ? format(options.startDate, 'yyyy-MM-dd') : undefined;
  const endDateStr = options?.endDate ? format(options.endDate, 'yyyy-MM-dd') : undefined;
  const preset = options?.preset;

  const fetchPurchases = useCallback(async () => {
    if (!venueId) {
      setPurchases([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchVenuePurchasesViaApi(venueId, startDateStr, endDateStr, preset);
      console.debug('[usePackagePurchases] fetched via API', data);
      let purchasesArr: any[] = [];
      if (Array.isArray(data)) purchasesArr = data as any[];
      else if (data && data.data && Array.isArray(data.data)) purchasesArr = data.data as any[];

      if (purchasesArr.length > 0) {
        setPurchases(purchasesArr as PackagePurchase[]);
      } else {
        setPurchases([]);
      }
    } catch (error) {
      console.error('Error fetching package purchases via API:', error);
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, startDateStr, endDateStr, preset]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const createPurchase = async (
    packageId: string,
    userId: string | null,
    totalPaid: number | null,
    guestName?: string,
    guestPhone?: string,
    expiresAt?: string
  ): Promise<{ success: boolean; error?: string; data?: PackagePurchase }> => {
    if (!venueId) return { success: false, error: 'No venue selected' };

    try {
      const payload = {
        user_id: userId,
        total_paid: totalPaid,
        guest_name: guestName || null,
        guest_phone: guestPhone || null,
        expires_at: expiresAt || null,
      };
      const data = await createPackagePurchaseApi(packageId, payload);
      // server handles sold_count increment; refresh list
      await fetchPurchases();
      return { success: true, data: data as PackagePurchase };
    } catch (error: any) {
      console.error('Error creating purchase via API:', error);
      return { success: false, error: error.message };
    }
  };

  const updatePurchaseStatus = async (
    purchaseId: string,
    status: PurchaseStatus
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await updatePackagePurchaseApi(purchaseId, { status });
      await fetchPurchases();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating purchase status via API:', error);
      return { success: false, error: error.message };
    }
  };

  const findPurchaseByQRCode = async (
    qrCode: string
  ): Promise<{ success: boolean; error?: string; data?: PackagePurchaseWithItems }> => {
    try {
      const data = await findPurchaseByQrApi(qrCode);
      return { success: true, data: data as PackagePurchaseWithItems };
    } catch (error: any) {
      console.error('Error finding purchase via API:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    purchases,
    isLoading,
    createPurchase,
    updatePurchaseStatus,
    findPurchaseByQRCode,
    refetch: fetchPurchases,
  };
}
