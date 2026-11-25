import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ExternalLink, LoaderCircle, MapPin, Navigation, Search } from 'lucide-react';
import {
  googleMapsSearchUrl, parseMapCoordinates, parsePlaceResults,
  placeSearchUrl, type PlaceSearchResult,
} from './domain/placeSearch';

type PlaceSearchProps = {
  onChoose: (place: PlaceSearchResult) => void;
};

const MIN_SEARCH_GAP_MS = 2500;
const MAX_CACHED_QUERIES = 20;

/** Simple two-path location picker: free OSM/Photon search or Google Maps coordinate import.
 * No API keys, no background searches, and no automated Google Maps scraping.
 */
export default function PlaceSearch({ onChoose }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [mapLocationText, setMapLocationText] = useState('');
  const [importError, setImportError] = useState('');
  const [imported, setImported] = useState(false);
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
      if (response.status === 429) throw new Error('บริการค้นหามีผู้ใช้งานมาก กรุณาลองใหม่ภายหลัง');
      if (response.status === 403) throw new Error('บริการค้นหาปฏิเสธคำขอ กรุณาใช้ Google Maps ช่วยหาพิกัด');
      if (!response.ok) throw new Error('ค้นหาไม่สำเร็จ กรุณาลองใหม่หรือใช้พิกัดจาก Google Maps');
      const data: unknown = await response.json();
      const nextResults = parsePlaceResults(data);
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
        ? err.message : 'เชื่อมต่อบริการค้นหาไม่ได้ ลองค้นผ่าน Google Maps แทน');
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
      if (!controller.signal.aborted) setWorking(false);
    }
  };

  const importPoint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImportError('');
    const location = parseMapCoordinates(mapLocationText);
    if (!location) {
      setImported(false);
      setImportError(/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(mapLocationText)
        ? 'ลิงก์ Google Maps แบบสั้นยังไม่มีพิกัดในข้อความ กรุณาคัดลอกพิกัดละติจูด,ลองจิจูดจาก Google Maps แทน'
        : 'ไม่พบพิกัด ลองวางตัวเลข เช่น 13.756300, 100.501800 หรือลิงก์ Google Maps แบบเต็ม');
      return;
    }
    setImported(true);
    setChosenId(null);
    onChooseRef.current({
      id: 'imported:' + location.latitude + ':' + location.longitude,
      title: query.trim() || '',
      address: 'นำเข้าพิกัดจาก Google Maps',
      ...location,
    });
  };

  return (
    <div className="hr-place-search">
      <div className="hr-place-search__heading">
        <label htmlFor="hr-place-search-input"><Search size={17} /> ค้นหาชื่อสถานที่</label>
        <span>ค้นหาได้หลายวิธี</span>
      </div>
      <form className="hr-place-search__form" onSubmit={event => { void search(event); }}>
        <div className="hr-place-search__input">
          <Search size={19} aria-hidden="true" />
          <input id="hr-place-search-input" type="search" value={query}
            onChange={event => {
              setQuery(event.target.value);
              setSearched(false);
              setResults([]);
              setError('');
            }}
            placeholder="ชื่อสถานที่ ถนน หรือจังหวัด" autoComplete="off"
            spellCheck={false} aria-label="พิมพ์ชื่อสถานที่เพื่อค้นหา" />
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
            {results.length ? 'เลือกสถานที่ที่ต้องการ' : 'ยังไม่พบจากฐานข้อมูลแผนที่ฟรี'}
          </div>
          {results.map(place => (
            <button type="button" key={place.id}
              className={'hr-place-search__result' + (chosenId === place.id ? ' is-selected' : '')}
              onClick={() => {
                setChosenId(place.id);
                setImported(false);
                onChooseRef.current(place);
              }}>
              <MapPin size={18} aria-hidden="true" />
              <span><strong>{place.title}</strong><small>{place.address}</small></span>
              {chosenId === place.id && <Check size={18} className="hr-place-search__check" aria-label="เลือกแล้ว" />}
            </button>
          ))}
          {!results.length && <p className="hr-place-search__empty">
            ลองเติมจังหวัดหรืออำเภอในชื่อ หรือใช้ Google Maps หาพิกัดด้านล่าง
          </p>}
        </div>
      )}
      <div className="hr-place-search__backup">
        <div className="hr-place-search__backup-head">
          <div><strong>หาไม่เจอ? ใช้ Google Maps ได้</strong>
            <small>เปิดค้นหาใน Google Maps แล้วนำพิกัดกลับมาปักบนแผนที่นี้</small></div>
          <a href={googleMapsSearchUrl(query)} target="_blank" rel="noopener noreferrer"
            className="hr-place-search__google">
            เปิด Google Maps <ExternalLink size={16} />
          </a>
        </div>
        <form onSubmit={importPoint} className="hr-place-search__import">
          <label htmlFor="hr-location-import"><Navigation size={16} /> วางพิกัดหรือ URL Google Maps แบบเต็ม</label>
          <div className="hr-place-search__import-row">
            <input id="hr-location-import" value={mapLocationText}
              onChange={event => {
                setMapLocationText(event.target.value);
                setImported(false);
                setImportError('');
              }}
              placeholder="13.756300, 100.501800"
              autoComplete="off" spellCheck={false} />
            <button className="hr-secondary" type="submit" disabled={!mapLocationText.trim()}>
              <MapPin size={17} /> ปักหมุด
            </button>
          </div>
          <p className="hr-place-search__tip">
            บนคอมพิวเตอร์ คลิกขวาที่จุดใน Google Maps แล้วกดพิกัดเพื่อคัดลอก
            หรือใช้ URL แบบเต็มที่มีพิกัด (ลิงก์สั้นไม่รองรับ)
          </p>
          {importError && <p className="hr-place-search__error" role="alert">{importError}</p>}
          {imported && <p className="hr-place-search__success" role="status">
            <Check size={16} /> นำพิกัดมาปักหมุดแล้ว ตรวจตำแหน่งและใส่ชื่อไซต์ก่อนบันทึก
          </p>}
        </form>
      </div>
      <p className="hr-place-search__credit">
        ค้นหาชื่อผ่าน Photon / <a href="https://www.openstreetmap.org/copyright"
          target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
        {' '}· บริการฟรีอาจมีข้อมูลไม่ครบหรือหยุดให้บริการได้ · ไม่ควรค้นหาข้อมูลส่วนบุคคล
      </p>
    </div>
  );
}
