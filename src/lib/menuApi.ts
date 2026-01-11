// FastAPI Menu API utilities
import { withApiBase } from './config';
import { getAuthHeader } from './utilsAuth';

async function parseErrorResponse(res: Response) {
  try {
    const json = await res.json();
    return json.detail || JSON.stringify(json);
  } catch (e) {
    try {
      return await res.text();
    } catch (e2) {
      return res.statusText || 'Unknown error';
    }
  }
}

export async function fetchVenueMenus(venueId: string) {
  const url = withApiBase(`/api/v1/sessions/venue/${venueId}/menus`);
  const headers = { ...(await getAuthHeader()) };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function fetchMenuItems(menuId: string) {
  const url = withApiBase(`/api/v1/sessions/menus/${menuId}/items`);
  const headers = { ...(await getAuthHeader()) };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function fetchVenueMenuItems(venueId: string) {
  const url = withApiBase(`/api/v1/sessions/venue/${venueId}/menu-items`);
  const headers = { ...(await getAuthHeader()) };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function createMenu(venueId: string, payload: { name: string; description?: string | null; }) {
  const url = withApiBase(`/api/v1/sessions/venue/${venueId}/menus`);
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function updateMenu(menuId: string, payload: Partial<{ name: string; description?: string | null; is_active?: boolean }>) {
  const url = withApiBase(`/api/v1/sessions/menus/${menuId}`);
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function deleteMenu(menuId: string) {
  const url = withApiBase(`/api/v1/sessions/menus/${menuId}`);
  const headers = { ...(await getAuthHeader()) };
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function createMenuItem(menuId: string, payload: { name: string; description?: string | null; price?: number | null; category?: string | null; dietary_tags?: string[]; is_available?: boolean; image_url?: string | null }) {
  const url = withApiBase(`/api/v1/sessions/menus/${menuId}/items`);
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function updateMenuItem(itemId: string, payload: Partial<{ name: string; description?: string | null; price?: number | null; category?: string | null; dietary_tags?: string[]; is_available?: boolean; image_url?: string | null }>) {
  const url = withApiBase(`/api/v1/sessions/menus/items/${itemId}`);
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeader()) };
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function deleteMenuItem(itemId: string) {
  const url = withApiBase(`/api/v1/sessions/menus/items/${itemId}`);
  const headers = { ...(await getAuthHeader()) };
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}
