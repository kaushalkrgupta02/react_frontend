// Venue Mode Types for production-ready code

export type PassType = 'entry' | 'vip';
export type PassStatus = 'active' | 'used' | 'refunded';
export type TabType = 'dashboard' | 'bookings' | 'passes' | 'promos' | 'preferences';
export type PassFilterType = 'all' | 'entry' | 'vip';
export type ScannerMode = 'choose' | 'scan' | 'manual';

export interface VenuePassVenue {
  id: string;
  name: string;
  cover_image_url: string | null;
  vip_pass_free_item: string | null;
}

export interface VenuePassProfile {
  display_name: string | null;
  phone: string | null;
}

export interface VenuePass {
  id: string;
  user_id: string;
  venue_id: string;
  pass_type: PassType;
  status: PassStatus;
  purchase_date: string;
  price: number;
  free_item_claimed: boolean;
  created_at: string;
  venue?: VenuePassVenue;
  profile?: VenuePassProfile;
}

export interface PassStats {
  total: number;
  entry: number;
  vip: number;
  active: number;
  used: number;
  revenue: number;
  freeItemsClaimed: number;
}

export interface QRCodeData {
  passId: string;
  passType: PassType;
  venueId: string;
  purchaseDate: string;
}

// Utility function for price formatting
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
