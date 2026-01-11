import { withApiBase } from './config';
import { getAuthHeader } from './utilsAuth';

async function parseResponse(res: Response) {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (res.ok) {
    if (contentType.includes('application/json')) return res.json();
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return txt; }
  }
  let err = `Request failed ${res.status}`;
  try { const txt = await res.text(); err = txt || err; } catch (e) {}
  throw new Error(err);
}

export async function fetchVenuePromos(venueId: string) {
  const url = withApiBase(`/api/v1/venues/promos/venue/${venueId}`);
  const headers = { ...(await getAuthHeader()) };
  console.debug('[promosApi] fetchVenuePromos ->', url, { headers });
  const res = await fetch(url, { headers });
  try { (res.clone()).text().then(txt => console.debug('[promosApi] raw response (promos):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function fetchVenuePromoAnalytics(venueId: string) {
  const url = withApiBase(`/api/v1/venues/promo-analytics/venue/${venueId}`);
  const headers = { ...(await getAuthHeader()) };
  console.debug('[promosApi] fetchVenuePromoAnalytics ->', url, { headers });
  const res = await fetch(url, { headers });
  try { (res.clone()).text().then(txt => console.debug('[promosApi] raw response (analytics):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function searchPromos(params: { term?: string; venueId?: string; isActive?: boolean; endsAtGte?: string; limit?: number }){
  const q = new URLSearchParams();
  if (params.term) q.append('term', params.term);
  if (params.venueId) q.append('venue_id', params.venueId);
  if (params.isActive !== undefined) q.append('is_active', String(params.isActive));
  if (params.endsAtGte) q.append('ends_at_gte', params.endsAtGte);
  if (params.limit) q.append('limit', String(params.limit));
  const url = withApiBase(`/api/v1/venues/promos/search${q.toString() ? `?${q.toString()}` : ''}`);
  const headers = { ...(await getAuthHeader()) };
  console.debug('[promosApi] searchPromos ->', url, { headers });
  const res = await fetch(url, { headers });
  try { (res.clone()).text().then(txt => console.debug('[promosApi] raw response (search):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}
