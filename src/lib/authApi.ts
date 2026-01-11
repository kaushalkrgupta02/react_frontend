// FastAPI Auth API utilities
const API_BASE_URL = '/auth'; // Change if backend is on a different host/port

export async function signUp({ email, password, display_name, role }) {
  const res = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name, role })
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Signup failed');
  return res.json();
}

export async function signIn({ email, password }) {
  const res = await fetch(`${API_BASE_URL}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Sign in failed');
  return res.json();
}

export async function getMe(token) {
  const res = await fetch(`${API_BASE_URL}/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Fetch user failed');
  return res.json();
}

export async function signOut() {
  // For FastAPI, sign out is usually handled client-side by removing tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
