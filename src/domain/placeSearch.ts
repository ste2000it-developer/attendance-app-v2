/** A narrow adapter for manual place-name lookup (no autocomplete or bulk geocoding).
 * Public Nominatim: https://operations.osmfoundation.org/policies/nominatim/
 */
export type PlaceSearchResult = {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
};

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export function placeSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    addressdetails: '0',
    limit: '5',
    'accept-language': 'th,en',
  });
  return NOMINATIM_ENDPOINT + '?' + params.toString();
}

export function parsePlaceResults(raw: unknown): PlaceSearchResult[] {
  if (!Array.isArray(raw)) return [];
  const results: PlaceSearchResult[] = [];
  const used = new Set<string>();
  for (const value of raw.slice(0, 10)) {
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    if ((typeof record.lat !== 'number' && typeof record.lat !== 'string') ||
      (typeof record.lon !== 'number' && typeof record.lon !== 'string') ||
      String(record.lat).trim() === '' || String(record.lon).trim() === '') continue;
    const latitude = Number(record.lat);
    const longitude = Number(record.lon);
    const address = typeof record.display_name === 'string' ? record.display_name.trim() : '';
    if (!address || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 85 || Math.abs(longitude) > 180) continue;
    const id = String(record.place_id ?? latitude + ':' + longitude);
    if (used.has(id)) continue;
    used.add(id);
    const title = address.split(',')[0]?.trim() || address;
    results.push({ id, title, address, latitude, longitude });
    if (results.length === 5) break;
  }
  return results;
}
