// FastAPI Table API utilities

export async function fetchVenueTables(venueId) {
  const res = await fetch(`/api/v1/venues/tables/venue/${venueId}`);
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to fetch tables');
  return res.json();
}
