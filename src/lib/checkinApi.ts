// FastAPI Check-in API utilities

export async function checkinGuest({ venueId, guestId, tableId }) {
  const res = await fetch(`/api/v1/sessions/venue/${venueId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_id: guestId, table_id: tableId })
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to check in guest');
  return res.json();
}
