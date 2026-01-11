export interface VenueFilters {
  distanceRadius: number | null; // km, null = any
  venueTypes: string[]; // venue type names
  statuses: string[]; // status values
  cover: 'any' | 'free' | 'cover';
  bookingOptions: string[]; // 'reservations' | 'line_skip'
}

export const defaultFilters: VenueFilters = {
  distanceRadius: null,
  venueTypes: [],
  statuses: [],
  cover: 'any',
  bookingOptions: [],
};

export const distanceOptions = [
  { value: 1, label: '1 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: null, label: 'Any distance' },
];

export const venueTypeOptions = [
  'Bar',
  'Lounge',
  'Club',
  'Activity Bar',
];

export const statusOptions = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'perfect', label: 'Perfect' },
  { value: 'ideal', label: 'Ideal' },
  { value: 'busy', label: 'Busy' },
  { value: 'too_busy', label: 'Too Busy' },
];

export const bookingOptions = [
  { value: 'reservations', label: 'Reservations' },
  { value: 'line_skip', label: 'Line Skip' },
];

export function hasActiveFilters(filters: VenueFilters): boolean {
  return (
    filters.distanceRadius !== null ||
    filters.venueTypes.length > 0 ||
    filters.statuses.length > 0 ||
    filters.cover !== 'any' ||
    filters.bookingOptions.length > 0
  );
}

export function countActiveFilters(filters: VenueFilters): number {
  let count = 0;
  if (filters.distanceRadius !== null) count++;
  if (filters.venueTypes.length > 0) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.cover !== 'any') count++;
  if (filters.bookingOptions.length > 0) count++;
  return count;
}
