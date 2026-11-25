import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePlaceResults, placeSearchUrl, parseMapCoordinates, googleMapsSearchUrl,
} from '../src/domain/placeSearch.ts';

test('Photon place query requires no API key and offers ten ranked results', () => {
  const url = new URL(placeSearchUrl('  เซ็นทรัลเวิลด์ กรุงเทพ  '));
  assert.equal(url.origin, 'https://photon.komoot.io');
  assert.equal(url.pathname, '/api/');
  assert.equal(url.searchParams.get('q'), 'เซ็นทรัลเวิลด์ กรุงเทพ');
  assert.equal(url.searchParams.get('limit'), '10');
  assert.equal(url.searchParams.has('key'), false);
});

test('parse GeoJSON rows and use longitude then latitude', () => {
  const rows = { type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [100.4929, 13.7511] },
      properties: { osm_type: 'N', osm_id: 14, name: 'วัดพระแก้ว',
        city: 'กรุงเทพมหานคร', country: 'ประเทศไทย' } },
    { geometry: { coordinates: [100.561, 13.736] },
      properties: { osm_type: 'W', osm_id: 15, name: 'อโศก', district: 'วัฒนา', city: 'กรุงเทพมหานคร' } },
  ] };
  assert.deepEqual(parsePlaceResults(rows), [
    { id: 'N:14:13.751100:100.492900', title: 'วัดพระแก้ว',
      address: 'วัดพระแก้ว, กรุงเทพมหานคร, ประเทศไทย', latitude: 13.7511, longitude: 100.4929 },
    { id: 'W:15:13.736000:100.561000', title: 'อโศก',
      address: 'อโศก, วัฒนา, กรุงเทพมหานคร', latitude: 13.736, longitude: 100.561 },
  ]);
});

test('ignore malformed GeoJSON and return at most ten place results', () => {
  const rows = {
    features: [
      {}, { properties: { name: 'missing point' }, geometry: {} },
      { properties: { name: 'bad' }, geometry: { coordinates: [100, 400] } },
      ...Array.from({ length: 18 }, (_, index) => ({
        properties: { name: 'Place ' + index, osm_id: index },
        geometry: { coordinates: [100.01 + index / 200, 13.7] },
      })),
    ],
  };
  assert.equal(parsePlaceResults(rows).length, 10);
  assert.deepEqual(parsePlaceResults({}), []);
  assert.deepEqual(parsePlaceResults([]), []);
});

test('Google Maps search URL is official cross-platform URL and needs no key', () => {
  const url = new URL(googleMapsSearchUrl('เซ็นทรัลเวิลด์'));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/search/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('query'), 'เซ็นทรัลเวิลด์');
  assert.equal(url.searchParams.has('key'), false);
});

test('import plain coordinates and explicit Maps URLs', () => {
  assert.deepEqual(parseMapCoordinates('13.756300, 100.501800'), {
    latitude: 13.7563, longitude: 100.5018,
  });
  assert.deepEqual(parseMapCoordinates('https://www.google.com/maps/place/Example/@13.7563,100.5018,15z/data=!3d13.70001!4d100.60002'), {
    latitude: 13.70001, longitude: 100.60002,
  });
  assert.deepEqual(parseMapCoordinates('https://maps.google.co.th/maps?ll=13.7563%2C100.5018'), {
    latitude: 13.7563, longitude: 100.5018,
  });
  assert.deepEqual(parseMapCoordinates('https://www.google.com/maps/@13.7563,100.5018,16z'), {
    latitude: 13.7563, longitude: 100.5018,
  });
  assert.deepEqual(parseMapCoordinates('https://www.google.com/maps/search/?api=1&query=13.7563%2C100.5018'), {
    latitude: 13.7563, longitude: 100.5018,
  });
});

test('do not guess coordinates for Google short links or untrusted URLs', () => {
  for (const input of [
    'https://maps.app.goo.gl/AbCdEf',
    'https://www.google.com/maps/place/OnlyName',
    'https://evil.example/maps/@13.7,100.5',
    '11, 200',
    'https://maps.google.co.th/?q=secret',
    '<script>alert(1)</script>',
  ]) assert.equal(parseMapCoordinates(input), null, input);
});
