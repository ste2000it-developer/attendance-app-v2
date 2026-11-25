/** Keyless place search and external-map coordinate import.
 * Photon is an OSM-based community demo, not a guaranteed production service.
 * Google Maps URLs are opened in the user's own browser (no Google API data is fetched).
 */
export type PlaceSearchResult = {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
};

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

export function placeSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: '10',
  });
  return PHOTON_ENDPOINT + '?' + params.toString();
}

export function googleMapsSearchUrl(query: string): string {
  const params = new URLSearchParams({ api: '1', query: query.trim() || 'ประเทศไทย' });
  return 'https://www.google.com/maps/search/?' + params.toString();
}

function validCoordinates(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 85 && Math.abs(lon) <= 180;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Photon returns a GeoJSON FeatureCollection; GeoJSON coordinates are [lon, lat]. */
export function parsePlaceResults(raw: unknown): PlaceSearchResult[] {
  if (!raw || typeof raw !== 'object') return [];
  const root = raw as { features?: unknown };
  if (!Array.isArray(root.features)) return [];
  const results: PlaceSearchResult[] = [];
  const used = new Set<string>();
  for (const item of root.features.slice(0, 30)) {
    if (!item || typeof item !== 'object') continue;
    const feature = item as { geometry?: { coordinates?: unknown }, properties?: Record<string, unknown> };
    const coordinates = feature.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
    if (typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') continue;
    const longitude = coordinates[0], latitude = coordinates[1];
    if (!validCoordinates(latitude, longitude)) continue;
    const props = feature.properties;
    if (!props || typeof props !== 'object') continue;
    const title = safeString(props.name) || safeString(props.street) || safeString(props.city) ||
      safeString(props.county) || safeString(props.state);
    const detail = [props.housenumber, props.street, props.district, props.city,
      props.county, props.state, props.country]
      .map(safeString).filter(Boolean);
    const address = [title, ...detail.filter(text => text !== title)].join(', ');
    if (!title) continue;
    const id = [props.osm_type, props.osm_id, latitude.toFixed(6), longitude.toFixed(6)].join(':');
    if (used.has(id)) continue;
    used.add(id);
    results.push({ id, title, address: address || title, latitude, longitude });
    if (results.length >= 10) break;
  }
  return results;
}

function pointFromNumbers(latText: string, lonText: string): {latitude: number;longitude: number} | null {
  const latitude = Number(latText), longitude = Number(lonText);
  if (!validCoordinates(latitude, longitude)) return null;
  return { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) };
}

/** Import coordinates copied from Google Maps or a full Google Maps browser URL.
 * Short maps.app.goo.gl links contain no coordinates and cannot be expanded client-side.
 * Prefer exact place positions (!3dLAT!4dLON), then explicit q/ll, then map-view @LAT,LON.
 */
export function parseMapCoordinates(input: string): {latitude: number; longitude: number} | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 6000) return null;
  const basic = trimmed.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,，]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (basic) return pointFromNumbers(basic[1], basic[2]);
  let url: URL;
  try { url = new URL(trimmed); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!(/(^|\.)google\.[a-z.]+$/i.test(url.hostname) ||
    ['maps.app.goo.gl', 'goo.gl'].includes(url.hostname))) return null;
  const urlText = decodeURIComponent(url.href.replace(/%(?![0-9a-f]{2})/gi, '%25'));
  const exact = urlText.match(/!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (exact) return pointFromNumbers(exact[1], exact[2]);
  // Some Google Maps URLs encode longitude before latitude.
  const alternate = urlText.match(/!2d(-?\d{1,3}(?:\.\d+)?)!3d(-?\d{1,3}(?:\.\d+)?)/);
  if (alternate) return pointFromNumbers(alternate[2], alternate[1]);
  for (const key of ['q', 'query', 'll', 'sll', 'center']) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    const match = value.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (match) return pointFromNumbers(match[1], match[2]);
  }
  const at = urlText.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  return at ? pointFromNumbers(at[1], at[2]) : null;
}
