import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaceResults, placeSearchUrl } from '../src/domain/placeSearch.ts';

test('place-name search URL is manual Nominatim query with no key and at most 5 results', () => {
  const url = new URL(placeSearchUrl('  เซ็นทรัลเวิลด์ กรุงเทพ  '));
  assert.equal(url.origin, 'https://nominatim.openstreetmap.org');
  assert.equal(url.pathname, '/search');
  assert.equal(url.searchParams.get('q'), 'เซ็นทรัลเวิลด์ กรุงเทพ');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('accept-language'), 'th,en');
  assert.equal(url.searchParams.has('key'), false);
});

test('parse search result rows with Thai place names and numeric coordinates', () => {
  const rows = [
    { place_id: 14, display_name: 'วัดพระแก้ว, พระนคร, กรุงเทพมหานคร', lat: '13.7511', lon: '100.4929' },
    { place_id: 15, display_name: 'อโศก, เขตวัฒนา, กรุงเทพมหานคร', lat: 13.736, lon: 100.561 },
  ];
  assert.deepEqual(parsePlaceResults(rows), [
    { id: '14', title: 'วัดพระแก้ว', address: 'วัดพระแก้ว, พระนคร, กรุงเทพมหานคร', latitude: 13.7511, longitude: 100.4929 },
    { id: '15', title: 'อโศก', address: 'อโศก, เขตวัฒนา, กรุงเทพมหานคร', latitude: 13.736, longitude: 100.561 },
  ]);
});

test('ignore bogus geocoder rows and de-duplicate, cap results at five', () => {
  const rows = [
    null,
    { place_id: 'a', display_name: '', lat: 13, lon: 100 },
    { place_id: 'b', display_name: 'Missing', lat: null, lon: '100' },
    { place_id: 'c', display_name: 'Bad', lat: '9999', lon: '100' },
    { place_id: 'd', display_name: 'Empty', lat: '', lon: '' },
    ...Array.from({length: 9}, (_, i) => ({ place_id: i + 1, display_name: 'Site ' + i, lat: String(13 + i / 100), lon: '100' })),
  ];
  const result = parsePlaceResults(rows);
  assert.equal(result.length, 5);
  assert.ok(result.every(p => p.latitude > 12 && p.latitude < 14));
  assert.deepEqual(parsePlaceResults({}), []); // any non-array response is empty
});
