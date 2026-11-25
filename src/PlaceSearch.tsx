import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, LoaderCircle, MapPin, Search } from 'lucide-react';
import {
  parsePlaceResults, placeSearchUrl, type PlaceSearchResult,
} from './domain/placeSearch';

type PlaceSearchProps = {
  onChoose: (place: PlaceSearchResult) => void;
};

const MIN_SEARCH_GAP_MS = 2500;
const MAX_CACHED_QUERIES = 20;

/**
 * Searches only when an admin explicitly submits, never on each keystroke.
 * The public OSM Nominatim endpoint is suitable for occasional manual lookup,
 * not an unlimited production geocoding service.
 */
export default function PlaceSearch({ onChoose }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const lastRequestRef = useRef(0);
  const cacheRef = useRef(new Map<string, PlaceSearchResult[]>());
  const activeRequestRef = useRef<AbortController | null>(null);
  const onChooseRef = useRef(onChoose);
  onChooseRef.current = onChoose;

  useEffect(() => () => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
  }, []);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = query.trim();
    if (working) return;
    setError('');
    setChosenId(null);
    if (text.length < 2 || text.length > 150) {
      setError('กรุณาพิมพ์ชื่อสถานที่ 2–150 ตัวอักษร');
      return;
    }
    const key = text.toLocaleLowerCase('th');
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResults(cached);
      setSearched(true);
      return;
    }
    // Intentionally no autocomplete: public Nominatim limits requests and
    // requires direct user initiation. Limit requests to at most 1 per 2.5s
    // within this admin tab; aggregate rate limits still apply to the app.
    if (Date.now() - lastRequestRef.current < MIN_SEARCH_GAP_MS) {
      setError('ค้นหาถี่เกินไป กรุณาลองอีกครั้งในอีกสักครู่');
      return;
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;
    lastRequestRef.current = Date.now();
    setWorking(true);
    setResults([]);
    setSearched(false);
    try {
      const response = await fetch(placeSearchUrl(text), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        referrerPolicy: 'origin',
        signal: controller.signal,
      });
      if (response.status === 429) {
        throw new Error('ระบบค้นหาสถานที่มีผู้ใช้งานมากเกินไป กรุณาลองใหม่ภายหลัง');
      }
      if (response.status === 403) {
        throw new Error('บริการค้นหาสถานที่ไม่อนุญาตการเข้าถึงจากเว็บนี้');
      }
      if (!response.ok) throw new Error('ค้นหาสถานที่ไม่ได้ในขณะนี้ กรุณาลองใหม่');
      const data: unknown = await response.json();
      const nextResults = parsePlaceResults(data);
      // Keep a tiny in-memory cache to avoid repeating the same request.
      if (cacheRef.current.size >= MAX_CACHED_QUERIES) {
        const first = cacheRef.current.keys().next().value;
        if (first) cacheRef.current.delete(first);
      }
      cacheRef.current.set(key, nextResults);
      setResults(nextResults);
      setSearched(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error && !/fetch/i.test(err.message)
        ? err.message
        : 'เชื่อมต่อบริการค้นหาไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
      if (!controller.signal.aborted) setWorking(false);
    }
  };

  return (
    <div className="hr-place-search">
      <div className="hr-place-search__heading">
        <label htmlFor="hr-place-search-input"><Search size={17} /> ค้นหาสถานที่จากชื่อ</label>
        <span>ไม่ต้องใช้ Google Maps</span>
      </div>
      <form className="hr-place-search__form" onSubmit={event => { void search(event); }}>
        <div className="hr-place-search__input">
          <Search size={19} aria-hidden="true" />
          <input id="hr-place-search-input" type="search" value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="เช่น เซ็นทรัลเวิลด์, วัดพระแก้ว, ชื่อถนน"
            autoComplete="off" spellCheck={false}
            aria-label="พิมพ์ชื่อสถานที่เพื่อค้นหา" />
        </div>
        <button type="submit" className="hr-primary" disabled={working || query.trim().length < 2}>
          {working ? <LoaderCircle size={17} className="hr-place-search__spinner" /> : <Search size={17} />}
          {working ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </form>
      {error && <p className="hr-place-search__error" role="alert">{error}</p>}
      {searched && (
        <div className="hr-place-search__results" aria-live="polite">
          <div className="hr-place-search__results-heading">
            {results.length ? 'เลือกสถานที่จากผลการค้นหา' : 'ไม่พบสถานที่ที่ตรงกับชื่อที่ค้นหา'}
          </div>
          {results.map(place => (
            <button type="button" key={place.id}
              className={'hr-place-search__result' + (chosenId === place.id ? ' is-selected' : '')}
              onClick={() => {
                setChosenId(place.id);
                onChooseRef.current(place);
              }}>
              <MapPin size={18} aria-hidden="true" />
              <span>
                <strong>{place.title}</strong>
                <small>{place.address}</small>
              </span>
              {chosenId === place.id && <Check size={18} className="hr-place-search__check" aria-label="เลือกแล้ว" />}
            </button>
          ))}
          {!results.length && <p className="hr-place-search__empty">
            ลองพิมพ์ชื่อพร้อมจังหวัด หรือปักหมุดบนแผนที่ด้วยตนเอง
          </p>}
        </div>
      )}
      <p className="hr-place-search__credit">
        ค้นหาเฉพาะเมื่อกดปุ่ม · ใช้ข้อมูลจาก{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
        {' '}ผ่าน Nominatim (บริการสาธารณะ มีข้อจำกัดการใช้งาน) · ไม่ควรค้นหาข้อมูลส่วนบุคคล
      </p>
    </div>
  );
}
