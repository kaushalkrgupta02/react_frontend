import { supabase } from '@/integrations/supabase/client';

export async function getAuthHeader() {
  try {
    const sessResp = await supabase.auth.getSession();
    const session = sessResp?.data?.session;
    const token = session?.access_token || session?.refresh_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch (e) {
    try {
      const key = Object.keys(localStorage).find(k => k.includes('supabase.auth.token'));
      if (key) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const t = parsed?.currentSession?.access_token || parsed?.currentSession?.access_token;
          if (t) return { Authorization: `Bearer ${t}` };
        }
      }
    } catch (err) {}
  }
  return {};
}
