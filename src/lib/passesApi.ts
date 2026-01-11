// FastAPI Passes API utilities
import { supabase } from '@/integrations/supabase/client';
import { withApiBase } from './config';
import { getAuthHeader } from './utilsAuth';

async function parseResponse(res: Response) {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  // Successful response: try parsing JSON, fall back to text
  if (res.ok) {
    if (contentType.includes('application/json')) {
      return res.json();
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  // Error response: try to extract JSON detail, otherwise return text/status
  let errMsg = `Request failed with status ${res.status}`;
  try {
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => null);
      if (body && typeof body === 'object' && 'detail' in body) errMsg = (body as any).detail || errMsg;
      else if (typeof body === 'string') errMsg = body;
    } else {
      const txt = await res.text().catch(() => null);
      if (txt) errMsg = txt;
    }
  } catch (e) {
    // ignore parsing errors
  }

  throw new Error(errMsg);
}



export async function fetchVenuePasses(venueId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const url = withApiBase(`/api/v1/venues/passes/venue/${venueId}${params.toString() ? `?${params.toString()}` : ''}`);
  const headers = { ...(await getAuthHeader()) };

  console.debug('[passesApi] fetchVenuePasses ->', url, { headers });
  const res = await fetch(url, { headers });

  // Log raw response (text) for debugging without consuming body for parseResponse
  try {
    const clone = res.clone();
    clone.text().then(txt => console.debug('[passesApi] raw response:', res.status, txt.slice(0, 200)));
  } catch (e) {
    console.debug('[passesApi] failed reading clone response', e);
  }

  return parseResponse(res);
}

export async function fetchPassById(passId: string) {
  const headers = { ...(await getAuthHeader()) };
  const url = withApiBase(`/api/v1/venues/passes/${passId}`);
  console.debug('[passesApi] fetchPassById ->', url, { headers });
  const res = await fetch(url, { headers });
  try { (res.clone()).text().then(txt => console.debug('[passesApi] raw response (getById):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function redeemPassApi(passId: string) {
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const url = withApiBase(`/api/v1/venues/passes/${passId}/redeem`);
  console.debug('[passesApi] redeemPassApi ->', url, { headers });
  const res = await fetch(url, {
    method: 'PATCH',
    headers
  });
  try { (res.clone()).text().then(txt => console.debug('[passesApi] raw response (redeem):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}

export async function claimFreeItemApi(passId: string) {
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const url = withApiBase(`/api/v1/venues/passes/${passId}/claim-free-item`);
  console.debug('[passesApi] claimFreeItemApi ->', url, { headers });
  const res = await fetch(url, {
    method: 'PATCH',
    headers
  });
  try { (res.clone()).text().then(txt => console.debug('[passesApi] raw response (claim):', res.status, txt.slice(0,200))); } catch (e) {}
  return parseResponse(res);
}