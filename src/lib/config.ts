export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
export const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_REST_URL || '';

export function withApiBase(path: string) {
  // Ensure path starts with / and avoid double slashes
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
