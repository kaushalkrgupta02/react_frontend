// FastAPI Guest API utilities

export async function fetchVenueGuests(venueId) {
  const res = await fetch(`/api/v1/venues/guests/venue/${venueId}`);
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch guests');
  return res.json();
}

export async function createGuest(payload) {
  const res = await fetch(`/api/v1/venues/guests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create guest');
  return res.json();
}
