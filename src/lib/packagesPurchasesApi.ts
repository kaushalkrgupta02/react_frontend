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

export async function fetchVenuePurchasesViaApi(venueId: string, startDate?: string, endDate?: string, preset?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (preset) params.append('preset', preset);
  const url = withApiBase(`/api/v1/venues/packages/purchases/venue/${venueId}${params.toString() ? `?${params.toString()}` : ''}`);
  const headers = { ...(await getAuthHeader()) };
  console.debug('[packagesPurchasesApi] fetchVenuePurchasesViaApi ->', url, { headers, startDate, endDate, preset });
  const res = await fetch(url, { headers });
  try { (res.clone()).text().then(txt => console.debug('[packagesPurchasesApi] raw response (list):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function createPackagePurchaseApi(packageId: string, payload: any) {
  const url = withApiBase(`/api/v1/venues/packages/${packageId}/purchases`);
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  console.debug('[packagesPurchasesApi] createPackagePurchaseApi ->', url, { headers, payload });
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  try { (res.clone()).text().then(txt => console.debug('[packagesPurchasesApi] raw response (create):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function updatePackagePurchaseApi(purchaseId: string, payload: any) {
  const url = withApiBase(`/api/v1/venues/packages/purchases/${purchaseId}`);
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  console.debug('[packagesPurchasesApi] updatePackagePurchaseApi ->', url, { headers, payload });
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  try { (res.clone()).text().then(txt => console.debug('[packagesPurchasesApi] raw response (update):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function findPurchaseByQrApi(qrCode: string) {
  const url = withApiBase(`/api/v1/venues/packages/purchases/qr/${encodeURIComponent(qrCode)}`);
  const headers = { ...(await getAuthHeader()) };
  console.debug('[packagesPurchasesApi] findPurchaseByQrApi ->', url, { headers });
  const res = await fetch(url, { headers });
  try { (res.clone()).text().then(txt => console.debug('[packagesPurchasesApi] raw response (find):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function createPackageRedemptionsApi(purchaseId: string, payload: any[]) {
  const url = withApiBase(`/api/v1/venues/packages/purchases/${purchaseId}/redemptions`);
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  console.debug('[packagesPurchasesApi] createPackageRedemptionsApi ->', url, { headers, payload });
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  try { (res.clone()).text().then(txt => console.debug('[packagesPurchasesApi] raw response (redemptions create):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function getRedemptionsForPurchaseApi(purchaseId: string) {
  const url = withApiBase(`/api/v1/venues/packages/purchases/${purchaseId}/redemptions`);
  const headers = { ...(await getAuthHeader()) };
  console.debug('[packagesPurchasesApi] getRedemptionsForPurchaseApi ->', url, { headers });
  const res = await fetch(url, { headers });
  try { (res.clone()).text().then(txt => console.debug('[packagesPurchasesApi] raw response (redemptions list):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}