import { useMemo, useState, type FormEvent, type MouseEvent } from 'react';
import {
  ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileSpreadsheet,
  Info, MapPin, Navigation, Plus, RefreshCcw, ShieldCheck, Users, XCircle,
} from 'lucide-react';
import {
  type AttendanceRecord, type DayShift, type Employee, type LeaveRequest,
  type GeoReading, type LocationDecision, type Worksite,
  bangkokInstant, effectiveShift, latenessMinutes, leaveDays, monthlyTimecard,
  overtimeCycleBounds, sumOvertimeCycle, toThaiDate,
  validateCheckIn, validateCheckOut,
} from './domain/attendanceRules';
import './hr-preview.css';

type Tab = 'overview' | 'employees' | 'schedules' | 'sites' | 'holidays' | 'leave' | 'reports';
type DemoLeave = LeaveRequest & { id: string; reviewedAt?: string };
const tabNames: Record<Tab, string> = {
  overview: 'ภาพรวม', employees: 'พนักงาน', schedules: 'ตารางงาน', sites: 'สถานที่',
  holidays: 'วันหยุด', leave: 'การลา', reports: 'รายงาน',
};
const today = toThaiDate(new Date());
const sampleLeaveTypes = [
  'ลาพักร้อนประจำปี', 'ลาป่วย', 'ลาเพื่อฝึกอบรม/พัฒนาความรู้',
  'ลารับราชการทหาร', 'ลาอุปสมบท', 'ลาคลอด', 'ลาเพื่อทำหมัน',
  'ลากิจโดยไม่รับค่าจ้าง', 'ลาฉุกเฉิน', 'อื่น ๆ',
] as const;
function nextId() { return Math.random().toString(36).slice(2, 12); }
function formString(data: FormData, name: string) { return String(data.get(name) ?? '').trim(); }
function prettyDate(date: string) { return date.split('-').reverse().join('/'); }
function formatMinutes(minutes: number) { return Math.floor(minutes / 60) + ' ชม. ' + (minutes % 60) + ' นาที'; }
function showShift(shift: DayShift): string {
  if (shift.kind === 'off') return 'วันหยุดประจำสัปดาห์';
  if (shift.kind === 'holiday') return 'วันหยุดบริษัท';
  return shift.startTime && shift.endTime
    ? shift.startTime + '–' + shift.endTime + (shift.endTime <= shift.startTime ? ' (ข้ามวัน)' : '')
    : 'ยังไม่กำหนดเวลา';
}
function toWorld(lat: number, lon: number, zoom: number) {
  const size = 256 * (2 ** zoom);
  const safeLat = Math.max(-85, Math.min(85, lat));
  const y = Math.log(Math.tan(Math.PI / 4 + (safeLat * Math.PI / 180) / 2));
  return { x: (lon + 180) / 360 * size, y: (1 - y / Math.PI) / 2 * size };
}
function fromWorld(x: number, y: number, zoom: number) {
  const size = 256 * (2 ** zoom);
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI;
  return { latitude: Math.max(-85, Math.min(85, lat)), longitude: (x / size * 360 + 540) % 360 - 180 };
}
/** Interactive real map tiles for placing a DEMO pin. Tiles: OpenStreetMap contributors. */
function SiteMap({ sites, pin, onPin }: {
  sites: Worksite[];
  pin: { latitude: number; longitude: number };
  onPin: (latitude: number, longitude: number) => void;
}) {
  const [view, setView] = useState({ latitude: 13.7563, longitude: 100.5018, zoom: 13 });
  const center = toWorld(view.latitude, view.longitude, view.zoom);
  const tiles: { x: number; y: number; dx: number; dy: number; key: string }[] = [];
  for (let iy = -2; iy <= 2; iy++) for (let ix = -2; ix <= 2; ix++) {
    const x = Math.floor(center.x / 256) + ix, y = Math.floor(center.y / 256) + iy;
    const n = 2 ** view.zoom;
    if (y >= 0 && y < n) tiles.push({
      x: ((x % n) + n) % n, y, dx: x * 256 - center.x, dy: y * 256 - center.y,
      key: x + ':' + y,
    });
  }
  const setAtClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - rect.width / 2;
    const py = event.clientY - rect.top - rect.height / 2;
    const coord = fromWorld(center.x + px, center.y + py, view.zoom);
    onPin(Number(coord.latitude.toFixed(6)), Number(coord.longitude.toFixed(6)));
  };
  const adjustZoom = (diff: number) => setView(prev => ({ ...prev, zoom: Math.min(18, Math.max(5, prev.zoom + diff)) }));
  const nudge = (dy: number, dx: number) => {
    const p = fromWorld(center.x + dx * 160, center.y + dy * 160, view.zoom);
    setView(prev => ({ ...prev, latitude: p.latitude, longitude: p.longitude }));
  };
  const markers = [{ id: 'pin', latitude: pin.latitude, longitude: pin.longitude, name: 'หมุดที่กำลังเลือก', selected: true },
    ...sites.map(site => ({ id: site.id, latitude: site.latitude, longitude: site.longitude, name: site.name, selected: false }))];
  return (
    <div className="hr-map" onClick={setAtClick} role="group" aria-label="แผนที่สำหรับปักหมุดสถานที่ คลิกบนแผนที่เพื่อเลือกพิกัด">
      {tiles.map(tile => <img key={tile.key}
        src={`https://tile.openstreetmap.org/${view.zoom}/${tile.x}/${tile.y}.png`}
        alt="" draggable={false}
        style={{ left: `calc(50% + ${tile.dx}px)`, top: `calc(50% + ${tile.dy}px)` }} />)}
      {markers.map(marker => {
        const pos = toWorld(marker.latitude, marker.longitude, view.zoom);
        const dx = pos.x - center.x, dy = pos.y - center.y;
        if (Math.abs(dx) > 600 || Math.abs(dy) > 600) return null;
        return <span key={marker.id} className={'hr-map__pin' + (marker.selected ? ' selected' : '')}
          style={{ left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)` }}
          title={marker.name}><MapPin size={24} fill={marker.selected ? 'currentColor' : 'none'} /></span>;
      })}
      <div className="hr-map__tools" onClick={event => event.stopPropagation()}>
        <button type="button" aria-label="เลื่อนแผนที่ขึ้น" onClick={() => nudge(-1, 0)}>↑</button>
        <button type="button" aria-label="เลื่อนแผนที่ลง" onClick={() => nudge(1, 0)}>↓</button>
        <button type="button" aria-label="เลื่อนแผนที่ซ้าย" onClick={() => nudge(0, -1)}>←</button>
        <button type="button" aria-label="เลื่อนแผนที่ขวา" onClick={() => nudge(0, 1)}>→</button>
        <button type="button" aria-label="ซูมเข้า" onClick={() => adjustZoom(1)}>+</button>
        <button type="button" aria-label="ซูมออก" onClick={() => adjustZoom(-1)}>−</button>
        <button type="button" onClick={() => setView(v => ({ ...v, latitude: pin.latitude, longitude: pin.longitude }))}>ไปที่หมุด</button>
      </div>
      <span className="hr-map__credit">© OpenStreetMap contributors</span>
    </div>
  );
}
export default function HRPreview() {
  const [tab, setTab] = useState<Tab>('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Worksite[]>([]);
  const [shifts, setShifts] = useState<{ employeeId: string; shift: DayShift }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [leaves, setLeaves] = useState<DemoLeave[]>([]);
  const [punches, setPunches] = useState<AttendanceRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [workday, setWorkday] = useState(today);
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [pin, setPin] = useState({ latitude: 13.7563, longitude: 100.5018 });
  const [geoResult, setGeoResult] = useState<LocationDecision | null>(null);
  const [geoError, setGeoError] = useState('');
  const [notice, setNotice] = useState('');
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const selected = employees.find(employee => employee.id === selectedEmployee) ?? null;
  const chosenShift = selected ? effectiveShift(workday, selected.workPattern, holidaySet,
    shifts.find(item => item.employeeId === selected.id && item.shift.date === workday)?.shift) : null;
  const [year, month] = reportMonth.split('-').map(Number);
  const filteredPunches = selected ? punches.filter(p => p.employeeId === selected.id) : [];
  const overrides = new Map(shifts.filter(s => s.employeeId === selected?.id).map(s => [s.shift.date, s.shift] as const));
  const overtime = sumOvertimeCycle(filteredPunches, year, month, holidaySet, selected?.workPattern, overrides);
  const [locating, setLocating] = useState(false);
  const createEmployee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    const code = formString(data, 'code');
    if (employees.some(e => e.code === code)) { setNotice('รหัสพนักงานนี้มีอยู่แล้ว'); return; }
    const employee: Employee = {
      id: nextId(), code, firstName: formString(data, 'firstName'), lastName: formString(data, 'lastName'),
      nickname: formString(data, 'nickname'), department: formString(data, 'department'),
      position: formString(data, 'position'), startDate: formString(data, 'startDate'),
      workPattern: formString(data, 'workPattern') === 'field' ? 'field' : 'office',
      scheduleType: (formString(data, 'scheduleType') || 'byJob') as Employee['scheduleType'], active: true,
    };
    setEmployees(prev => [...prev, employee]);
    if (!selectedEmployee) setSelectedEmployee(employee.id);
    setNotice('เพิ่มพนักงานในตัวอย่างแล้ว ไม่ได้บันทึกเข้าบริษัท');
    form.reset();
  };
  const createShift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget), date = formString(data, 'date');
    const kind = formString(data, 'kind') as DayShift['kind'];
    const shift: DayShift = {
      date, kind, startTime: kind === 'work' ? formString(data, 'startTime') : undefined,
      endTime: kind === 'work' ? formString(data, 'endTime') : undefined,
      title: formString(data, 'title'),
    };
    if (kind === 'work' && (!shift.startTime || !shift.endTime)) { setNotice('กรุณาระบุเวลาเข้า–ออกของงาน'); return; }
    setShifts(prev => [...prev.filter(x => x.employeeId !== selected.id || x.shift.date !== date),
      { employeeId: selected.id, shift }]);
    setNotice('บันทึกตารางงานในโหมดทดลองแล้ว');
  };
  const createSite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const site: Worksite = {
      id: nextId(), name: formString(data, 'name'), latitude: pin.latitude, longitude: pin.longitude,
      radiusMeters: Number(data.get('radius')), enabled: true,
    };
    if (!site.name || !Number.isFinite(site.radiusMeters) || site.radiusMeters <= 0 ||
      !Number.isFinite(site.latitude) || Math.abs(site.latitude) > 90 ||
      !Number.isFinite(site.longitude) || Math.abs(site.longitude) > 180) {
      setNotice('กรุณากรอกชื่อและรัศมีที่ถูกต้อง'); return;
    }
    setSites(prev => [...prev, site]); setGeoResult(null);
    setNotice('ปักหมุดตัวอย่างแล้ว สามารถเปิด–ปิดไซต์นี้ได้');
    event.currentTarget.reset();
  };
  const checkGps = () => {
    if (!navigator.geolocation) { setGeoError('เบราว์เซอร์นี้ไม่รองรับ GPS'); return; }
    setLocating(true); setGeoError(''); setGeoResult(null);
    navigator.geolocation.getCurrentPosition(position => {
      const geo: GeoReading = {
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      };
      setGeoResult(validateCheckIn(geo, sites));
      setLocating(false);
    }, error => {
      setGeoError(error.code === 1 ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง' : 'ตรวจตำแหน่งไม่ได้ กรุณาลองใหม่');
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  };
  const addHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const date = formString(new FormData(event.currentTarget), 'holiday');
    if (date) setHolidays(prev => [...new Set([...prev, date])].sort());
  };
  const createLeave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const id = formString(d, 'employeeId'), employee = employees.find(e => e.id === id);
    if (!employee) { setNotice('กรุณาเลือกพนักงาน'); return; }
    const req: DemoLeave = {
      id: nextId(), employeeId: id, type: formString(d, 'type') as DemoLeave['type'],
      startDate: formString(d, 'startDate'), endDate: formString(d, 'endDate'),
      portion: formString(d, 'portion') as DemoLeave['portion'],
      reason: formString(d, 'reason'), status: 'pending',
    };
    try {
      const days = leaveDays(req, employee.workPattern, holidaySet,
        new Map(shifts.filter(s => s.employeeId === id).map(s => [s.shift.date, s.shift])));
      if (days <= 0) { setNotice('วันที่เลือกไม่มีวันทำงาน'); return; }
      setLeaves(prev => [req, ...prev]); setNotice('สร้างคำขอลาตัวอย่าง ' + days + ' วัน');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'ข้อมูลวันลาไม่ถูกต้อง'); }
  };
  const addPunch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) { setNotice('กรุณาเลือกพนักงาน'); return; }
    const d = new FormData(event.currentTarget);
    const date = formString(d, 'date'), inTime = formString(d, 'inTime'), outTime = formString(d, 'outTime');
    const nextDay = d.get('nextDay') === 'on';
    const record: AttendanceRecord = {
      id: nextId(), employeeId: selected.id, date,
      checkIn: inTime ? new Date(bangkokInstant(date, inTime)).toISOString() : null,
      checkOut: outTime ? new Date(bangkokInstant(date, outTime, nextDay)).toISOString() : null,
    };
    if (record.checkIn && record.checkOut && Date.parse(record.checkOut) < Date.parse(record.checkIn)) {
      setNotice('เวลาออกต้องอยู่หลังเวลาเข้า เลือกช่องข้ามวันถ้าทำงานข้ามคืน'); return;
    }
    setPunches(prev => [...prev.filter(p => p.employeeId !== selected.id || p.date !== date), record]);
    setNotice('เพิ่มข้อมูลตอกบัตรเพื่อทดสอบรายงานเท่านั้น');
  };
  const selectedName = (id: string) => {
    const employee = employees.find(item => item.id === id);
    return employee ? employee.firstName + ' ' + employee.lastName : '—';
  };
  return (
    <div className="hr-page">
      <header className="hr-header">
        <div>
          <a className="hr-back" href="./"><ArrowLeft size={16} /> กลับหน้าพนักงาน</a>
          <h1>Attendance V2 <span>HR / Admin</span></h1>
          <p>หน้าทดลองระบบจัดการบริษัท — ไม่มีการเชื่อมต่อหรือบันทึกข้อมูลจริง</p>
        </div>
        <span className="hr-preview-pill">DEMO ONLY</span>
      </header>
      <div className="hr-demo-banner" role="status"><Info size={20} />
        ข้อมูลที่กรอกจะอยู่ในหน้านี้ชั่วคราวเท่านั้นและหายเมื่อรีเฟรช ไม่ใช้สำหรับบันทึกเวลางานหรือข้อมูล HR จริง
      </div>
      <nav className="hr-tabs" aria-label="เมนูแอดมิน">
        {(Object.keys(tabNames) as Tab[]).map(key =>
          <button type="button" key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setNotice(''); }}>
            {tabNames[key]}
          </button>)}
      </nav>
      {notice && <div className="hr-message" role="status"><Info size={16} />{notice}<button type="button" onClick={() => setNotice('')}>ปิด</button></div>}
      <main className="hr-content">
        {tab === 'overview' && <>
          <div className="hr-section-heading"><h2>ภาพรวมระบบ</h2><p>จำนวนที่แสดงเป็นข้อมูลทดลองในหน้านี้เท่านั้น</p></div>
          <div className="hr-stats">
            <article><Users /><strong>{employees.length}</strong><span>พนักงานทดลอง</span></article>
            <article><MapPin /><strong>{sites.filter(s => s.enabled).length}</strong><span>ไซต์งานเปิดใช้งาน</span></article>
            <article><ClipboardList /><strong>{leaves.filter(l => l.status === 'pending').length}</strong><span>ใบลารออนุมัติ</span></article>
            <article><Clock3 /><strong>{punches.length}</strong><span>รายการเวลาทดลอง</span></article>
          </div>
          <div className="hr-card">
            <h3>ขอบเขตที่พัฒนาไว้ในโหมดทดลอง</h3>
            <p>จัดการพนักงานและตารางงานรายวัน ปักหมุดและเปิด–ปิด GPS Geofence ตรวจ GPS ปัจจุบัน
              ทดลองอนุมัติลา ตรวจชั่วโมง OT ข้ามวันและรอบ 25–24</p>
            <p>การลงเวลาจริง การส่ง Push Notification การอ่าน Google Calendar และการเชื่อมฐานข้อมูลยังไม่เปิดใช้
              เพราะต้องตั้งค่าระบบฝั่งเซิร์ฟเวอร์และสิทธิ์ผู้ใช้ให้ปลอดภัยก่อน</p>
          </div>
        </>}
        {tab === 'employees' && <>
          <div className="hr-section-heading"><h2>จัดการพนักงาน</h2><p>ไม่มีช่องสาขาและประเภทการจ้าง</p></div>
          <form className="hr-card hr-form" onSubmit={createEmployee}>
            <div className="hr-form-grid">
              <label>รหัสพนักงาน<input name="code" required placeholder="เช่น EMP001" /></label>
              <label>ชื่อ<input name="firstName" required /></label>
              <label>นามสกุล<input name="lastName" required /></label>
              <label>ชื่อเล่น<input name="nickname" /></label>
              <label>แผนก<input name="department" required /></label>
              <label>ตำแหน่ง<input name="position" required /></label>
              <label>วันที่เริ่มงาน<input name="startDate" type="date" required defaultValue={today} /></label>
              <label>ลักษณะงาน<select name="workPattern" defaultValue="office">
                <option value="office">ออฟฟิศ (จ.–ศ.)</option><option value="field">ช่าง/ภาคสนาม (จ.–ส.)</option>
              </select></label>
              <label>ตารางงาน<select name="scheduleType" defaultValue="byJob">
                <option value="morning">เช้า</option><option value="afternoon">บ่าย</option>
                <option value="night">กลางคืน</option><option value="byJob">ตามงาน</option>
              </select></label>
            </div><button className="hr-primary" type="submit"><Plus size={18} /> เพิ่มพนักงานทดลอง</button>
          </form>
          <section className="hr-card"><h3>รายชื่อพนักงาน ({employees.length})</h3>
            {!employees.length ? <p>ยังไม่ได้เพิ่มพนักงานทดลอง</p> :
              <div className="hr-table-wrap"><table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>แผนก/ตำแหน่ง</th><th>ตาราง</th><th>สถานะ</th></tr></thead>
                <tbody>{employees.map(e => <tr key={e.id}><td>{e.code}</td><td>{e.firstName} {e.lastName}<small>{e.nickname}</small></td>
                  <td>{e.department}<small>{e.position}</small></td><td>{e.workPattern === 'office' ? 'ออฟฟิศ' : 'ภาคสนาม'}</td>
                  <td><button type="button" className="hr-text-button" onClick={() => setEmployees(prev => prev.map(item => item.id === e.id ? { ...item, active: !item.active } : item))}>
                    {e.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</button></td></tr>)}</tbody>
              </table></div>}</section>
        </>}
        {tab === 'schedules' && <>
          <div className="hr-section-heading"><h2>ตารางงานรายวัน</h2><p>ออฟฟิศ 08:00–17:00 จ.–ศ. / ช่างกำหนดตามงาน</p></div>
          <div className="hr-card">
            <div className="hr-form-grid">
              <label>พนักงาน<select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                <option value="">เลือกพนักงาน</option>{employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.code} — {e.firstName}</option>)}
              </select></label>
              <label>วันที่<input type="date" value={workday} onChange={e => setWorkday(e.target.value)} /></label>
            </div>
            {chosenShift ? <div className="hr-status-info"><CalendarDays size={19} />
              ตารางที่ใช้: <strong>{showShift(chosenShift)}</strong></div> : <p>เพิ่มพนักงานทดลองก่อน</p>}
          </div>
          <form key={selectedEmployee + ':' + workday} className="hr-card hr-form" onSubmit={createShift}>
            <h3>กำหนดหรือยกเว้นตารางงาน</h3>
            <div className="hr-form-grid">
              <label>วันที่<input type="date" name="date" required value={workday} onChange={e => setWorkday(e.target.value)} /></label>
              <label>ประเภทวัน<select name="kind" defaultValue="work">
                <option value="work">วันทำงาน</option><option value="off">วันหยุดตามตาราง</option><option value="holiday">วันหยุดบริษัท</option>
              </select></label>
              <label>เวลาเข้า<input type="time" name="startTime" defaultValue="08:00" /></label>
              <label>เวลาออก<input type="time" name="endTime" defaultValue="17:00" /></label>
              <label>งานที่ได้รับ<input name="title" placeholder="เช่น งานติดตั้ง" /></label>
            </div><button type="submit" className="hr-primary" disabled={!selected}><Plus size={18} /> บันทึกตารางทดลอง</button>
          </form>
          <div className="hr-card"><h3>ตารางที่กำหนด ({shifts.length})</h3>
            {!shifts.length ? <p>ยังไม่ได้กำหนดตารางรายวัน</p> :
              <div className="hr-table-wrap"><table><thead><tr><th>พนักงาน</th><th>วันที่</th><th>ตาราง</th><th>จัดการ</th></tr></thead>
                <tbody>{shifts.map(item => <tr key={item.employeeId + item.shift.date}><td>{selectedName(item.employeeId)}</td>
                  <td>{prettyDate(item.shift.date)}</td><td>{showShift(item.shift)}</td>
                  <td><button className="hr-text-button" onClick={() => setShifts(prev => prev.filter(x => x !== item))}>ลบ</button></td></tr>)}</tbody>
              </table></div>}</div>
        </>}
        {tab === 'sites' && <>
          <div className="hr-section-heading"><h2>สถานที่ทำงานและ GPS</h2><p>เลือกหมุดบนแผนที่ แล้วตั้งรัศมีแยกแต่ละไซต์</p></div>
          <div className="hr-card">
            <SiteMap sites={sites} pin={pin} onPin={(latitude, longitude) => setPin({ latitude, longitude })} />
            <p className="hr-muted">แตะบนแผนที่เพื่อเลือกพิกัดใหม่ หรือกรอกละติจูด/ลองจิจูดด้านล่าง</p>
            <div className="hr-form-grid">
              <label>ละติจูด<input type="number" step="any" value={pin.latitude} onChange={e => setPin(prev => ({ ...prev, latitude: Number(e.target.value) }))} /></label>
              <label>ลองจิจูด<input type="number" step="any" value={pin.longitude} onChange={e => setPin(prev => ({ ...prev, longitude: Number(e.target.value) }))} /></label>
            </div>
          </div>
          <form className="hr-card hr-form" onSubmit={createSite}>
            <div className="hr-form-grid">
              <label>ชื่อสถานที่<input name="name" required placeholder="เช่น สำนักงานใหญ่" /></label>
              <label>รัศมี (เมตร)<input name="radius" type="number" required min="1" defaultValue="100" /></label>
            </div>
            <button className="hr-primary" type="submit"><MapPin size={18} /> เพิ่มหมุดทดลอง</button>
          </form>
          <div className="hr-card"><h3>หมุดบริษัท ({sites.length})</h3>
            {!sites.length ? <p>ยังไม่มีไซต์งานทดลอง</p> :
              <div className="hr-table-wrap"><table><thead><tr><th>สถานที่</th><th>พิกัด</th><th>รัศมี</th><th>เปิดใช้งาน</th></tr></thead>
                <tbody>{sites.map(site => <tr key={site.id}><td>{site.name}</td>
                  <td>{site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}</td><td>{site.radiusMeters} ม.</td>
                  <td><button className="hr-text-button" type="button" onClick={() => setSites(prev => prev.map(x => x.id === site.id ? { ...x, enabled: !x.enabled } : x))}>
                    {site.enabled ? 'เปิด' : 'ปิด'}</button></td></tr>)}</tbody>
              </table></div>}</div>
          <div className="hr-card">
            <h3>ทดลองตรวจ GPS ขณะนี้</h3><p>ตรวจได้ทุกไซต์ที่เปิดใช้งาน ไม่จำกัดไซต์ที่พนักงานได้รับมอบหมาย การทดลองนี้ไม่ตอกบัตรจริง</p>
            <button className="hr-primary" type="button" disabled={locating || !sites.some(s => s.enabled)}
              onClick={checkGps}><Navigation size={18} /> {locating ? 'กำลังตรวจ GPS...' : 'ตรวจ GPS ของอุปกรณ์นี้'}</button>
            {geoResult && <p role="status" className="hr-status-info">
              {geoResult.status === 'allowed' ? <CheckCircle2 /> : <XCircle />}
              {geoResult.note} {geoResult.site ? '(' + geoResult.site.name + ')' : ''}
            </p>}
            {geoError && <p role="alert" className="hr-error">{geoError}</p>}
            <p className="hr-muted">การตอกออกทำได้ทุกตำแหน่งเมื่อ GPS ใช้งานได้: {validateCheckOut({ latitude: pin.latitude, longitude: pin.longitude, accuracyMeters: 10 }).note}</p>
          </div>
        </>}
        {tab === 'holidays' && <>
          <div className="hr-section-heading"><h2>วันหยุดบริษัท</h2><p>ส่วนนี้ใช้วันที่ที่กรอกเพื่อทดลองการนับวันลาและตารางงาน ไม่ได้เชื่อม Google Calendar จริง</p></div>
          <form className="hr-card hr-form" onSubmit={addHoliday}>
            <label>เพิ่มวันหยุดทดลอง<input type="date" name="holiday" defaultValue={today} required /></label>
            <button className="hr-primary" type="submit"><Plus size={18} /> เพิ่มวันหยุด</button>
          </form>
          <section className="hr-card"><h3>วันหยุด ({holidays.length})</h3>
            {!holidays.length ? <p>ยังไม่มีวันหยุดทดลอง</p> :
              <div className="hr-holidays">{holidays.map(date => <div key={date}><span>{prettyDate(date)}</span>
                <button type="button" onClick={() => setHolidays(v => v.filter(x => x !== date))}>ลบ</button>
              </div>)}</div>}</section>
        </>}
        {tab === 'leave' && <>
          <div className="hr-section-heading"><h2>จัดการคำขอลา</h2><p>10 ประเภท ลาเต็มวัน/ครึ่งวันเช้า/ครึ่งวันบ่าย</p></div>
          <form className="hr-card hr-form" onSubmit={createLeave}>
            <h3>สร้างใบลาเพื่อทดสอบการอนุมัติ</h3>
            <div className="hr-form-grid">
              <label>พนักงาน<select name="employeeId" required><option value="">เลือกพนักงาน</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.code} — {e.firstName}</option>)}</select></label>
              <label>ประเภทการลา<select name="type">{sampleLeaveTypes.map(t => <option key={t}>{t}</option>)}</select></label>
              <label>เริ่มลา<input name="startDate" type="date" defaultValue={today} required /></label>
              <label>สิ้นสุด<input name="endDate" type="date" defaultValue={today} required /></label>
              <label>ระยะเวลา<select name="portion">
                <option value="full">เต็มวัน</option><option value="morning">ครึ่งวันเช้า</option>
                <option value="afternoon">ครึ่งวันบ่าย</option>
              </select></label>
              <label>หมายเหตุ<input name="reason" /></label>
            </div><button type="submit" className="hr-primary" disabled={!employees.length}><Plus size={18} /> สร้างคำขอทดลอง</button>
          </form>
          <div className="hr-card"><h3>คำขอทั้งหมด ({leaves.length})</h3>
            {!leaves.length ? <p>ยังไม่มีคำขอตัวอย่าง และยังไม่เชื่อมใบลาจริงจากหน้าพนักงาน</p> :
              <div className="hr-table-wrap"><table><thead><tr><th>พนักงาน</th><th>ประเภท</th><th>ช่วงวันที่</th><th>สถานะ</th><th>อนุมัติ</th></tr></thead>
                <tbody>{leaves.map(l => <tr key={l.id}>
                  <td>{selectedName(l.employeeId)}</td><td>{l.type}</td>
                  <td>{prettyDate(l.startDate)} – {prettyDate(l.endDate)}<small>{l.portion === 'full' ? 'เต็มวัน' : l.portion === 'morning' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย'}</small></td>
                  <td>{l.status === 'pending' ? 'รออนุมัติ' : l.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'}</td>
                  <td>{l.status === 'pending' && <>
                    <button type="button" className="hr-text-button" onClick={() => setLeaves(p => p.map(x => x.id === l.id ? { ...x, status: 'approved', reviewedAt: new Date().toISOString() } : x))}>อนุมัติ</button>
                    <button type="button" className="hr-text-button" onClick={() => setLeaves(p => p.map(x => x.id === l.id ? { ...x, status: 'rejected', reviewedAt: new Date().toISOString() } : x))}>ไม่อนุมัติ</button>
                  </>}</td>
                </tr>)}</tbody></table></div>}</div>
        </>}
        {tab === 'reports' && <>
          <div className="hr-section-heading"><h2>รายงานและรอบ OT</h2><p>ป้อนเวลาเพื่อทดสอบสูตรเท่านั้น ไม่ได้ตอกบัตรจริง</p></div>
          <div className="hr-card">
            <div className="hr-form-grid">
              <label>พนักงาน<select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                <option value="">เลือกพนักงาน</option>{employees.map(e => <option key={e.id} value={e.id}>{e.code} — {e.firstName}</option>)}
              </select></label>
              <label>รอบ OT เริ่มวันที่ 25<input type="month" value={reportMonth} onChange={e => { if (e.target.value) setReportMonth(e.target.value); }} /></label>
            </div>
            <p>รอบ {prettyDate(overtimeCycleBounds(year, month).from)} – {prettyDate(overtime.through)}</p>
            <div className="hr-stats">
              <article><Clock3 /><strong>{formatMinutes(overtime.minutes)}</strong><span>OT ที่คำนวณได้</span></article>
              <article><Info /><strong>{overtime.missingCheckoutCount}</strong><span>ยังไม่มีเวลาเข้า/ออกครบ</span></article>
              <article><ShieldCheck /><strong>{overtime.pendingHrReviewCount}</strong><span>รอ HR ตรวจสอบ</span></article>
            </div>
          </div>
          <form className="hr-card hr-form" onSubmit={addPunch}>
            <h3>เพิ่มรายการทดลอง</h3>
            <div className="hr-form-grid">
              <label>วันทำงาน<input name="date" type="date" defaultValue={today} required /></label>
              <label>เวลาเข้า<input name="inTime" type="time" /></label>
              <label>เวลาออก<input name="outTime" type="time" /></label>
              <label className="hr-check"><input name="nextDay" type="checkbox" /> เวลาออกเป็นวันถัดไป</label>
            </div>
            <button className="hr-primary" type="submit" disabled={!selected}><Plus size={18} /> เพิ่มรายการเพื่อทดสอบ</button>
          </form>
          <div className="hr-card"><h3>บัตรตอกเวลารายเดือน (ตัวอย่าง)</h3>
            <p className="hr-muted">แสดงทุกวันของเดือนรวมวันหยุด ไม่มีการเดาเวลาออก</p>
            {!selected ? <p>เลือกพนักงานก่อน</p> : <div className="hr-table-wrap">
              <table><thead><tr><th>วันที่</th><th>เข้า</th><th>ออก</th><th>สาย</th><th>OT</th></tr></thead>
                <tbody>{monthlyTimecard(year, month, filteredPunches).map(row => {
                  const shift = effectiveShift(row.date, selected.workPattern, holidaySet,
                    shifts.find(s => s.employeeId === selected.id && s.shift.date === row.date)?.shift);
                  const ot = row.record && row.checkOut ? sumOvertimeCycle([row.record], year, month, holidaySet, selected.workPattern, overrides).minutes : null;
                  const late = row.record ? latenessMinutes(row.record.checkIn, shift) : null;
                  return <tr key={row.date}>
                    <td>{prettyDate(row.date)}</td>
                    <td>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '✎'}</td>
                    <td>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '✎'}</td>
                    <td>{late ?? '—'}</td><td>{ot === null ? '—' : formatMinutes(ot)}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>}
          </div>
          <div className="hr-card hr-status-info"><FileSpreadsheet size={20} />
            Export Excel/A5, สิทธิ์ HR และข้อมูลรายงานจริงจะเปิดได้หลังเชื่อมระบบจัดเก็บและอนุมัติข้อมูลอย่างปลอดภัย
          </div>
        </>}
      </main>
      <footer className="hr-footer"><RefreshCcw size={15} /> ตัวอย่างเท่านั้น · การรีเฟรชจะล้างข้อมูลที่กรอกในหน้านี้</footer>
    </div>
  );
}
