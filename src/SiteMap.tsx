import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { Crosshair, LocateFixed, MapPin, RefreshCcw } from 'lucide-react';
import type { Worksite } from './domain/attendanceRules';
import 'leaflet/dist/leaflet.css';

type Point = { latitude: number; longitude: number };

type SiteMapProps = {
  sites: readonly Worksite[];
  pin: Point;
  radiusMeters: number;
  onPin: (latitude: number, longitude: number) => void;
  focusSignal: number;
  focusPoint: Point;
};

const pointIsValid = (p: Point) =>
  Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 85 &&
  Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;

const roundLocation = (p: L.LatLng): Point => ({
  latitude: Number(p.lat.toFixed(6)),
  longitude: Number(p.lng.toFixed(6)),
});

const markerIcon = (variant: 'draft' | 'active' | 'inactive') => L.divIcon({
  className: 'hr-leaflet-pin hr-leaflet-pin--' + variant,
  html: '<span class="hr-leaflet-pin__head"></span><span class="hr-leaflet-pin__tail"></span>',
  iconSize: [32, 43],
  iconAnchor: [16, 41],
  popupAnchor: [0, -36],
});

function textTooltip(text: string) {
  const span = document.createElement('span');
  span.textContent = text;
  return span;
}

/**
 * Leaflet manages pan/zoom/coordinates. React only manages the selected pin
 * and circles, so editing a form never recreates the map or resets its zoom.
 */
export default function SiteMap({ sites, pin, radiusMeters, onPin, focusSignal, focusPoint }: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const siteLayerRef = useRef<L.LayerGroup | null>(null);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const [tileIssue, setTileIssue] = useState(false);
  const [alternateTiles, setAlternateTiles] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    const center = pointIsValid(pinRef.current) ? pinRef.current : { latitude: 13.7563, longitude: 100.5018 };
    const map = L.map(container, {
      center: [center.latitude, center.longitude],
      zoom: 15,
      minZoom: 4,
      maxZoom: 19,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      keyboard: true,
      touchZoom: true,
      zoomSnap: 0.5,
    });
    mapRef.current = map;
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 130 }).addTo(map);

    const sitesLayer = L.layerGroup().addTo(map);
    const draftLayer = L.layerGroup().addTo(map);
    siteLayerRef.current = sitesLayer;
    draftLayerRef.current = draftLayer;
    map.on('click', (event: L.LeafletMouseEvent) => {
      const location = roundLocation(event.latlng);
      onPinRef.current(location.latitude, location.longitude);
    });

    const frame = requestAnimationFrame(() => map.invalidateSize({ pan: false, debounceMoveend: true }));
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
      : null;
    observer?.observe(container);
    const onResize = () => map.invalidateSize({ pan: false, debounceMoveend: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      map.off();
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      siteLayerRef.current = null;
      draftLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    setTileIssue(false);
    const options: L.TileLayerOptions = {
      minZoom: 4,
      maxZoom: 19,
      maxNativeZoom: 19,
      attribution: alternateTiles
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };
    const url = alternateTiles
      ? 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const layer = L.tileLayer(url, options);
    layer.on('tileerror', () => setTileIssue(true));
    layer.on('load', () => setTileIssue(false));
    layer.addTo(map);
    tileRef.current = layer;
    return () => {
      layer.off();
      layer.remove();
    };
  }, [alternateTiles]);

  useEffect(() => {
    const layer = siteLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const site of sites) {
      if (!pointIsValid(site) || !Number.isFinite(site.radiusMeters) || site.radiusMeters <= 0) continue;
      const center: L.LatLngExpression = [site.latitude, site.longitude];
      L.circle(center, {
        radius: site.radiusMeters,
        color: site.enabled ? '#008a82' : '#7a8990',
        weight: 1.8,
        fillColor: site.enabled ? '#19b5a5' : '#8e9ba1',
        fillOpacity: site.enabled ? 0.12 : 0.05,
        dashArray: site.enabled ? undefined : '5 5',
        interactive: false,
      }).addTo(layer);
      L.marker(center, { icon: markerIcon(site.enabled ? 'active' : 'inactive') })
        .bindTooltip(textTooltip(site.name + (site.enabled ? ' · เปิดใช้งาน' : ' · ปิดใช้งาน')), {
          direction: 'top', offset: [0, -26],
        }).addTo(layer);
    }
  }, [sites]);

  useEffect(() => {
    const layer = draftLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!pointIsValid(pin)) return;
    const center: L.LatLngExpression = [pin.latitude, pin.longitude];
    const validRadius = Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 100;
    L.circle(center, {
      radius: validRadius,
      color: '#ff8748',
      weight: 2.5,
      fillColor: '#ffa36b',
      fillOpacity: 0.17,
      dashArray: '7 5',
      interactive: false,
    }).addTo(layer);
    L.marker(center, { icon: markerIcon('draft'), draggable: true, autoPan: true })
      .on('dragend', (event: L.DragEndEvent) => {
        const marker = event.target as L.Marker;
        const next = roundLocation(marker.getLatLng());
        onPinRef.current(next.latitude, next.longitude);
      })
      .bindTooltip('ตำแหน่งใหม่ · ลากหมุดเพื่อปรับ', { direction: 'top', offset: [0, -24] })
      .addTo(layer);
  }, [pin, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pointIsValid(focusPoint) || focusSignal === 0) return;
    map.flyTo([focusPoint.latitude, focusPoint.longitude], Math.max(map.getZoom(), 15), { duration: 0.42 });
  }, [focusSignal]); // Focus only on the explicit action, never whenever a coordinate input changes.

  const focusPin = () => {
    if (!mapRef.current || !pointIsValid(pin)) return;
    mapRef.current.flyTo([pin.latitude, pin.longitude], Math.max(mapRef.current.getZoom(), 15), { duration: 0.42 });
  };
  const showAll = () => {
    const coords = [...sites.filter(pointIsValid), pin].filter(pointIsValid);
    const map = mapRef.current;
    if (!map || !coords.length) return;
    if (coords.length === 1) { focusPin(); return; }
    map.fitBounds(L.latLngBounds(coords.map(p => [p.latitude, p.longitude])), { padding: [50, 50], maxZoom: 16 });
  };

  return (
    <div className="hr-map-wrap">
      <div className="hr-map-topline">
        <span><MapPin size={16} /> แผนที่ไซต์งาน</span>
        <span className="hr-map-legend"><i /> หมุดใหม่ <i /> ไซต์ที่บันทึกแล้ว</span>
      </div>
      <div className="hr-leaflet-map" ref={containerRef} role="application"
        aria-label="แผนที่ปักหมุดไซต์งาน เลื่อนด้วยนิ้วหรือเมาส์ และแตะเพื่อเลือกจุด" />
      <div className="hr-map-actions" aria-label="เครื่องมือแผนที่">
        <button type="button" onClick={focusPin}><LocateFixed size={16} /> ไปที่หมุด</button>
        <button type="button" onClick={showAll}><Crosshair size={16} /> ดูทั้งหมด</button>
        <button type="button" onClick={() => { setTileIssue(false); setAlternateTiles(v => !v); }}>
          <RefreshCcw size={15} /> {alternateTiles ? 'แผนที่มาตรฐาน' : tileIssue ? 'ลองแผนที่สำรอง' : 'เปลี่ยนแบบแผนที่'}</button>
      </div>
      <p className="hr-map-helper">
        แตะพื้นที่เพื่อปักหมุด หรือลากหมุดสีส้มเพื่อปรับตำแหน่ง • ใช้ปุ่ม +/− บนแผนที่เพื่อซูม
      </p>
    </div>
  );
}
