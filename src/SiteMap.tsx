import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Crosshair, LocateFixed, MapPin, RefreshCcw } from 'lucide-react';
import type { Worksite } from './domain/attendanceRules';
import 'maplibre-gl/dist/maplibre-gl.css';

// OpenFreeMap's recommended Vite worker setup: no API key or billing.
maplibregl.setWorkerUrl(workerUrl);

type Point = { latitude: number; longitude: number };
type StyleName = 'liberty' | 'positron';
type SiteMapProps = {
  sites: readonly Worksite[];
  pin: Point;
  radiusMeters: number;
  onPin: (latitude: number, longitude: number) => void;
  focusSignal: number;
  focusPoint: Point;
};

const OPENFREEMAP = 'https://tiles.openfreemap.org/styles/';
const EARTH_RADIUS_M = 6_371_008.8;
const DEG = Math.PI / 180;
const MAP_SOURCE = 'hr-site-radius-polygons';
const MAP_FILL = 'hr-site-radius-fill';
const MAP_OUTLINE = 'hr-site-radius-outline';

function validPoint(p: Point): boolean {
  return Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 85 &&
    Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
}
function roundCoordinates(p: { lat: number; lng: number }): Point {
  return { latitude: Number(p.lat.toFixed(6)), longitude: Number(p.lng.toFixed(6)) };
}

/** Geodesic circle, measured in metres rather than CSS pixels. */
function ringCoordinates(point: Point, radiusMeters: number): number[][] {
  const lat = point.latitude * DEG;
  const lon = point.longitude * DEG;
  const distance = radiusMeters / EARTH_RADIUS_M;
  const coords: number[][] = [];
  for (let i = 0; i <= 96; i++) {
    const direction = 2 * Math.PI * i / 96;
    const nextLat = Math.asin(
      Math.sin(lat) * Math.cos(distance) +
      Math.cos(lat) * Math.sin(distance) * Math.cos(direction),
    );
    const nextLon = lon + Math.atan2(
      Math.sin(direction) * Math.sin(distance) * Math.cos(lat),
      Math.cos(distance) - Math.sin(lat) * Math.sin(nextLat),
    );
    coords.push([nextLon / DEG, nextLat / DEG]);
  }
  return coords;
}

function radiusPolygons(sites: readonly Worksite[], pin: Point, radiusMeters: number) {
  const validSites = sites.filter(site => validPoint(site) &&
    Number.isFinite(site.radiusMeters) && site.radiusMeters > 0);
  const validRadius = Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 100;
  const circles = [
    ...validSites.map(site => ({
      location: site as Point, radius: site.radiusMeters,
      fill: site.enabled ? '#10b6a1' : '#9baab0',
      stroke: site.enabled ? '#008a80' : '#89959c',
      opacity: site.enabled ? 0.13 : 0.06,
    })),
    ...(validPoint(pin) ? [{
      location: pin, radius: validRadius, fill: '#ffad65', stroke: '#f38942', opacity: 0.21,
    }] : []),
  ];
  return {
    type: 'FeatureCollection' as const,
    features: circles.map(circle => ({
      type: 'Feature' as const,
      properties: { fill: circle.fill, stroke: circle.stroke, opacity: circle.opacity },
      geometry: { type: 'Polygon' as const, coordinates: [ringCoordinates(circle.location, circle.radius)] },
    })),
  };
}

function markerElement(type: 'draft' | 'active' | 'inactive', label: string) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'hr-maplibre-pin hr-maplibre-pin--' + type;
  el.setAttribute('aria-label', label);
  el.title = label;
  el.innerHTML = '<span class="hr-maplibre-pin__head"></span><span class="hr-maplibre-pin__center"></span>';
  // Clicking an existing pin should not unintentionally move the draft pin beneath it.
  el.addEventListener('click', event => event.stopPropagation());
  return el;
}

/**
 * MapLibre handles tile rendering, panning, zooming and drag coordinates.
 * The map stays mounted when React forms change, preserving the user's viewport.
 * All maps use OpenFreeMap's keyless vector styles.
 */
export default function SiteMap({
  sites, pin, radiusMeters, onPin, focusSignal, focusPoint,
}: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const draftMarkerRef = useRef<maplibregl.Marker | null>(null);
  const savedMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;
  const latestRef = useRef({ sites, pin, radiusMeters });
  latestRef.current = { sites, pin, radiusMeters };
  const refreshRingsRef = useRef<() => void>(() => {});
  const [styleName, setStyleName] = useState<StyleName>('positron');
  const previousStyleRef = useRef<StyleName>('positron');
  const [mapError, setMapError] = useState('');

  refreshRingsRef.current = () => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    const { sites: currentSites, pin: currentPin, radiusMeters: currentRadius } = latestRef.current;
    const data = radiusPolygons(currentSites, currentPin, currentRadius);
    if (!map.getSource(MAP_SOURCE)) {
      map.addSource(MAP_SOURCE, { type: 'geojson', data });
      map.addLayer({
        id: MAP_FILL, type: 'fill', source: MAP_SOURCE,
        paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'opacity'] },
      });
      map.addLayer({
        id: MAP_OUTLINE, type: 'line', source: MAP_SOURCE,
        paint: { 'line-color': ['get', 'stroke'], 'line-width': 2.1 },
      });
    } else {
      (map.getSource(MAP_SOURCE) as maplibregl.GeoJSONSource).setData(data);
    }
  };

  // Create and dispose the map exactly once. Changes to inputs never rebuild it.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const initial = validPoint(latestRef.current.pin)
      ? latestRef.current.pin : { latitude: 13.7563, longitude: 100.5018 };
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: OPENFREEMAP + previousStyleRef.current,
        center: [initial.longitude, initial.latitude],
        zoom: 15,
        minZoom: 4,
        maxZoom: 19,
        dragRotate: false,
        pitchWithRotate: false,
        scrollZoom: false,
      });
    } catch {
      setMapError('เปิดแผนที่ไม่ได้ กรุณาตรวจการรองรับ WebGL บนอุปกรณ์');
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 130, unit: 'metric' }), 'bottom-left');

    map.on('click', event => {
      const next = roundCoordinates(event.lngLat);
      if (validPoint(next)) onPinRef.current(next.latitude, next.longitude);
    });
    map.on('style.load', () => {
      setMapError('');
      refreshRingsRef.current();
      map.resize();
    });
    map.on('error', () => setMapError('แผนที่โหลดบางส่วนไม่สำเร็จ ลองเปลี่ยนรูปแบบแผนที่'));
    map.on('load', () => map.resize());

    const frame = window.requestAnimationFrame(() => map.resize());
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        if (mapRef.current === map) map.resize();
      })
      : null;
    observer?.observe(container);
    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      savedMarkersRef.current.forEach(marker => marker.remove());
      savedMarkersRef.current = [];
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch between two freely hosted OpenFreeMap basemap styles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || previousStyleRef.current === styleName) return;
    previousStyleRef.current = styleName;
    setMapError('');
    map.setStyle(OPENFREEMAP + styleName);
  }, [styleName]);

  // Keep saved site markers synchronized without disturbing the camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    savedMarkersRef.current.forEach(marker => marker.remove());
    savedMarkersRef.current = sites.filter(validPoint).map(site => {
      const label = site.name + (site.enabled ? ' · เปิดใช้งาน' : ' · ปิดใช้งาน');
      return new maplibregl.Marker({
        element: markerElement(site.enabled ? 'active' : 'inactive', label),
        anchor: 'bottom',
      })
        .setLngLat([site.longitude, site.latitude])
        .setPopup(new maplibregl.Popup({ offset: 30, closeButton: false }).setText(label))
        .addTo(map);
    });
    refreshRingsRef.current();
  }, [sites]);

  // Draft marker is persistent even when dragging; only its position changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !validPoint(pin)) return;
    if (!draftMarkerRef.current) {
      const marker = new maplibregl.Marker({
        element: markerElement('draft', 'ลากหมุดสีส้มเพื่อเลือกตำแหน่งใหม่'),
        anchor: 'bottom',
        draggable: true,
      }).setLngLat([pin.longitude, pin.latitude]).addTo(map);
      marker.on('dragend', () => {
        const next = roundCoordinates(marker.getLngLat());
        if (validPoint(next)) onPinRef.current(next.latitude, next.longitude);
      });
      draftMarkerRef.current = marker;
    } else {
      draftMarkerRef.current.setLngLat([pin.longitude, pin.latitude]);
    }
    refreshRingsRef.current();
  }, [pin, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusSignal === 0 || !validPoint(focusPoint)) return;
    map.flyTo({ center: [focusPoint.longitude, focusPoint.latitude],
      zoom: Math.max(map.getZoom(), 15), duration: 420 });
  }, [focusSignal, focusPoint]);

  const focusDraft = () => {
    const map = mapRef.current;
    if (map && validPoint(pin)) {
      map.flyTo({ center: [pin.longitude, pin.latitude],
        zoom: Math.max(map.getZoom(), 15), duration: 420 });
    }
  };
  const showAll = () => {
    const map = mapRef.current;
    if (!map) return;
    const points = [...sites.filter(validPoint), pin].filter(validPoint);
    if (points.length < 2) { focusDraft(); return; }
    const bounds = new maplibregl.LngLatBounds();
    points.forEach(point => bounds.extend([point.longitude, point.latitude]));
    map.fitBounds(bounds, { padding: 50, maxZoom: 16, duration: 420 });
  };

  return (
    <div className="hr-map-wrap">
      <div className="hr-map-topline">
        <span><MapPin size={16} /> แผนที่ไซต์งาน</span>
        <span className="hr-map-legend"><i /> หมุดใหม่ <i /> ไซต์ที่บันทึกแล้ว</span>
      </div>
      <div className="hr-leaflet-map hr-maplibre-map" ref={containerRef} role="application"
        aria-label="แผนที่ไซต์งาน OpenFreeMap แตะเพื่อปักหมุด เลื่อนและซูมด้วยนิ้ว" />
      {mapError && <p className="hr-map-error" role="status">{mapError}</p>}
      <div className="hr-map-actions" aria-label="เครื่องมือแผนที่">
        <button type="button" onClick={focusDraft}><LocateFixed size={16} /> ไปที่หมุด</button>
        <button type="button" onClick={showAll}><Crosshair size={16} /> ดูทั้งหมด</button>
        <button type="button" onClick={() => setStyleName(current => current === 'liberty' ? 'positron' : 'liberty')}>
          <RefreshCcw size={15} /> {styleName === 'positron' ? 'แผนที่สี' : 'แผนที่เรียบ'}
        </button>
      </div>
      <p className="hr-map-helper">
        แตะแผนที่เพื่อปักหมุด หรือลากหมุดสีส้มเพื่อปรับตำแหน่ง • วงสีส้มแสดงรัศมีจริงเป็นเมตร
      </p>
      <p className="hr-map-attribution-note">ข้อมูลแผนที่จาก OpenFreeMap / OpenStreetMap · ฟรี ไม่ต้องใช้ API Key</p>
    </div>
  );
}
