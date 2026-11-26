import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft, BarChart3, CalendarDays, CalendarOff, CheckCircle2, ChevronDown,
  ChevronRight, ClipboardList, Clock3, FileSpreadsheet, Info, LayoutDashboard,
  Plus, RefreshCcw, Search, ShieldCheck, Users, X,
} from 'lucide-react';
import {
  type AttendanceRecord, type DayShift, type Employee, type LeaveRequest,
  bangkokInstant, effectiveShift, latenessMinutes, leaveDays, monthlyTimecard,
  overtimeCycleBounds, sumOvertimeCycle, toThaiDate,
} from './domain/attendanceRules';
import './hr-preview.css';
import './hr-redesign.css';
import { exportLeaveA5 } from './exportLeaveExcel';

type Tab = 'overview' | 'employees' | 'schedules' | 'holidays' | 'leave' | 'reports';
type DemoLeave = LeaveRequest & { id: string; reviewedAt?: string };
const primaryTabs: Tab[] = ['overview', 'leave', 'schedules', 'reports'];
const setupTabs: Tab[] = ['employees', 'holidays'];
const tabNames: Record<Tab, string> = {
  overview: 'ภาพรวม', employees: 'พนักงาน', schedules: 'ตารางงาน',
  holidays: 'วันหยุด', leave: 'การลา', reports: 'รายงาน',
};
const tabIcons = {
  overview: LayoutDashboard, employees: Users, schedules: CalendarDays,
  holidays: CalendarOff, leave: ClipboardList, reports: BarChart3,
} as const;
const tabDescriptions: Record<Tab, string> = {
  overview: 'สรุปสิ่งที่ต้องดูและรายการสำคัญในที่เดียว',
  employees: 'ข้อมูลพนักงาน แผนก และสถานะการทำงาน',
  schedules: 'กำหนดเวลางานตามบุคคลและแต่ละวัน',
  holidays: 'วันหยุดบริษัทสำหรับการคำนวณตารางงานและการลา',
  leave: 'ตรวจสอบคำขอ อนุมัติ และส่งออกเอกสาร',
  reports: 'ตรวจเวลางาน การมาสาย และรอบสรุป OT',
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
export default function HRPreview() {
  useEffect(() => {
    document.body.classList.add('hr-admin-active');
    return () => document.body.classList.remove('hr-admin-active');
  }, []);
  const [tab, setTab] = useState<Tab>('overview');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showPunchForm, setShowPunchForm] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState<'pending' | 'all'>('pending');
  const [reportLevel, setReportLevel] = useState<'year' | 'month' | 'day'>('year');
  const [reportDay, setReportDay] = useState(today);
  const navigate = (next: Tab) => {
    setTab(next);
    setNotice('');
    setShowEmployeeForm(false);
    setShowShiftForm(false);
    setShowHolidayForm(false);
    setShowLeaveForm(false);
    setShowPunchForm(false);
    window.scrollTo({ top: 0 });
  };
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<{ employeeId: string; shift: DayShift }[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [leaves, setLeaves] = useState<DemoLeave[]>([]);
  const [punches, setPunches] = useState<AttendanceRecord[]>([]);
  const [lateExemptions, setLateExemptions] = useState<Record<string, string>>({});
  const [editingExemptionId, setEditingExemptionId] = useState<string | null>(null);
  const [exemptionReason, setExemptionReason] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [workday, setWorkday] = useState(today);
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [notice, setNotice] = useState('');
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const selected = employees.find(employee => employee.id === selectedEmployee) ?? null;
  const focusedEmployee = employees.find(employee => employee.id === openEmployeeId) ?? null;
  const filteredEmployees = employees.filter(employee =>
    [employee.firstName, employee.lastName, employee.nickname, employee.code, employee.department]
      .join(' ').toLocaleLowerCase('th').includes(employeeQuery.trim().toLocaleLowerCase('th')));
  const filteredLeaves = leaves.filter(request => leaveFilter === 'all' || request.status === 'pending')
    .sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
  const pendingCount = leaves.filter(request => request.status === 'pending').length;
  const chosenShift = selected ? effectiveShift(workday, selected.workPattern, holidaySet,
    shifts.find(item => item.employeeId === selected.id && item.shift.date === workday)?.shift) : null;
  const [year, month] = reportMonth.split('-').map(Number);
  const filteredPunches = selected ? punches.filter(p => p.employeeId === selected.id) : [];
  const overrides = new Map(shifts.filter(s => s.employeeId === selected?.id).map(s => [s.shift.date, s.shift] as const));
  const overtime = sumOvertimeCycle(filteredPunches, year, month, holidaySet, selected?.workPattern, overrides);
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
    setShowEmployeeForm(false);
    setEmployeeQuery('');
    setOpenEmployeeId(employee.id);
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
    setShowShiftForm(false);
  };
  const addHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const date = formString(new FormData(event.currentTarget), 'holiday');
    if (date) {
      setHolidays(prev => [...new Set([...prev, date])].sort());
      setShowHolidayForm(false);
      setNotice('เพิ่มวันหยุดในตัวอย่างแล้ว');
    }
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
      setShowLeaveForm(false);
      setLeaveFilter('pending');
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
      manualIn: d.get('manual') === 'on', manualOut: d.get('manual') === 'on',
      hrReviewed: d.get('manual') !== 'on',
    };
    if (record.checkIn && record.checkOut && Date.parse(record.checkOut) < Date.parse(record.checkIn)) {
      setNotice('เวลาออกต้องอยู่หลังเวลาเข้า เลือกช่องข้ามวันถ้าทำงานข้ามคืน'); return;
    }
    setPunches(prev => [...prev.filter(p => p.employeeId !== selected.id || p.date !== date), record]);
    setNotice('เพิ่มข้อมูลตอกบัตรเพื่อทดสอบรายงานเท่านั้น');
    setReportMonth(date.slice(0, 7));
    setReportLevel('month');
    setShowPunchForm(false);
  };
  const downloadLeave = async (request: DemoLeave) => {
    const employee = employees.find(x => x.id === request.employeeId);
    if (!employee) { setNotice('ไม่พบพนักงานสำหรับใบลานี้'); return; }
    try {
      const count = leaveDays(request, employee.workPattern, holidaySet,
        new Map(shifts.filter(s => s.employeeId === employee.id).map(s => [s.shift.date, s.shift])));
      await exportLeaveA5(request, employee.firstName + ' ' + employee.lastName, employee.code, count);
      setNotice('สร้างไฟล์ Excel ใบลา A5 จากข้อมูลทดลองเรียบร้อยแล้ว');
    } catch (error) {
      setNotice(error instanceof Error ? 'ส่งออก Excel ไม่สำเร็จ: ' + error.message : 'ส่งออก Excel ไม่สำเร็จ');
    }
  };
  const selectedName = (id: string) => {
    const employee = employees.find(item => item.id === id);
    return employee ? employee.firstName + ' ' + employee.lastName : '—';
  };
  return (
    <div className="hr-page">
      <aside className="hr-sidebar" aria-label="เมนูจัดการ HR">
        <div className="hr-brand">
          <span className="hr-brand__icon" aria-hidden="true"><img src={import.meta.env.BASE_URL + 'icon.svg'} alt="" /></span>
          <div><strong>Attendance</strong><small>ระบบลงเวลาพนักงาน</small></div>
        </div>
        <div className="hr-sidebar__label">งานประจำวัน</div>
        <nav className="hr-tabs" aria-label="งานประจำวัน">
          {primaryTabs.map(key => {
            const Icon = tabIcons[key];
            return <button type="button" key={key}
              className={tab === key ? 'active' : ''}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => navigate(key)}>
              <Icon size={20} strokeWidth={1.9} />
              <span>{tabNames[key]}</span>
              {key === 'leave' && pendingCount > 0 && <b className="hr-nav-count">{pendingCount}</b>}
              <ChevronRight className="hr-tab-chevron" size={16} />
            </button>;
          })}
        </nav>
        <div className="hr-sidebar__label">ข้อมูลและการตั้งค่า</div>
        <nav className="hr-tabs" aria-label="ข้อมูลและการตั้งค่า">
          {setupTabs.map(key => {
            const Icon = tabIcons[key];
            return <button type="button" key={key}
              className={tab === key ? 'active' : ''}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => navigate(key)}>
              <Icon size={20} strokeWidth={1.9} />
              <span>{tabNames[key]}</span>
              <ChevronRight className="hr-tab-chevron" size={16} />
            </button>;
          })}
        </nav>
        <div className="hr-sidebar__bottom">
          <div className="hr-sidebar__demo"><span /> โหมดทดลอง</div>
          <a className="hr-back" href="./"><ArrowLeft size={16} /> กลับหน้าตอกบัตร</a>
        </div>
      </aside>
      <div className="hr-workspace">
        <header className="hr-header">
          <div>
            <span className="hr-eyebrow">Attendance / ผู้ดูแลระบบ</span>
            <h1>{tab === 'overview' ? 'จัดการงานวันนี้' : tabNames[tab]}</h1>
            <p>{tabDescriptions[tab]}</p>
          </div>
          <div className="hr-header__actions">
            <span className="hr-preview-pill"><span /> โหมดทดลอง</span>
            <a className="hr-header__back" href="./"><ArrowLeft size={16} /> หน้าตอกบัตร</a>
          </div>
        </header>
        <div className="hr-demo-banner" role="status">
          <Info size={19} />
          <span>พื้นที่ทดลองเท่านั้น — ข้อมูลที่กรอกจะหายเมื่อรีเฟรช ไม่มีการบันทึกเข้าระบบบริษัท</span>
        </div>
        <nav className="hr-mobile-tabs" aria-label="เมนูจัดการ">
          {[...primaryTabs, ...setupTabs].map(key => {
            const Icon = tabIcons[key];
            return <button type="button" key={key}
              className={tab === key ? 'active' : ''}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => navigate(key)}>
              <Icon size={18} strokeWidth={1.9} />{tabNames[key]}
              {key === 'leave' && pendingCount > 0 && <b className="hr-nav-count">{pendingCount}</b>}
            </button>;
          })}
        </nav>
        <div className="hr-content-area">
          {notice && <div className="hr-message" role="status">
            <Info size={16} />{notice}
            <button type="button" onClick={() => setNotice('')}>ปิด</button>
          </div>}
          <main className="hr-content">
        {tab === 'overview' && <>
          <section className="hr-today">
            <div>
              <span className="hr-today__eyebrow">ภาพรวมระบบ</span>
              <h2>วันนี้จัดการอะไรดี?</h2>
              <p>งานสำคัญอยู่ตรงนี้ เริ่มจัดการได้ทันที ไม่ต้องไล่หาเมนู</p>
            </div>
            <div className="hr-today__date"><CalendarDays size={20} />
              {new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok',
                day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
            </div>
          </section>
          <section className="hr-task-board" aria-label="ทางลัดไปยังงานสำคัญ">
            <div className="hr-section-head">
              <div><h3>เริ่มจากงานที่ต้องทำ</h3><p>เลือกงาน แล้วไปจัดการต่อได้เลย</p></div>
            </div>
            <div className="hr-task-grid">
              <button type="button" onClick={() => { setLeaveFilter('pending'); navigate('leave'); }}>
                <span className="hr-task-icon hr-task-icon--warm"><ClipboardList size={22} /></span>
                <span><strong>ตรวจคำขอลา</strong>
                  <small>{pendingCount > 0 ? pendingCount + ' คำขอรออนุมัติ' : 'ยังไม่มีคำขอรออนุมัติ'}</small></span>
                <ChevronRight size={19} />
              </button>
              <button type="button" onClick={() => navigate('schedules')}>
                <span className="hr-task-icon"><CalendarDays size={22} /></span>
                <span><strong>จัดตารางงาน</strong><small>เลือกพนักงานและวันทำงาน</small></span>
                <ChevronRight size={19} />
              </button>
              <button type="button" onClick={() => navigate('employees')}>
                <span className="hr-task-icon"><Users size={22} /></span>
                <span><strong>รายชื่อพนักงาน</strong><small>ดูข้อมูลและเพิ่มพนักงาน</small></span>
                <ChevronRight size={19} />
              </button>
            </div>
          </section>
          <div className="hr-section-head hr-section-head--overview">
            <div><h3>ข้อมูลในระบบทดลอง</h3><p>สรุปรายการที่เพิ่มในหน้านี้เท่านั้น</p></div>
          </div>
          <div className="hr-stats">
            <article><Users /><strong>{employees.length}</strong><span>พนักงาน</span></article>
            
            <article><ClipboardList /><strong>{pendingCount}</strong><span>คำขอลารอตรวจ</span></article>
            <article><Clock3 /><strong>{punches.length}</strong><span>รายการเวลา</span></article>
          </div>
          <details className="hr-card hr-system-details">
            <summary><Info size={17} /> รายละเอียดระบบทดลอง <ChevronDown size={17} /></summary>
            <p>การบันทึกเวลาจริง การส่งแจ้งเตือน การเชื่อม Google Calendar และฐานข้อมูลบริษัท
              ยังไม่เปิดใช้ ข้อมูลที่เพิ่มในหน้าผู้ดูแลจะหายเมื่อรีเฟรช</p>
          </details>
        </>}
        {tab === 'employees' && <>
          {!showEmployeeForm && <section className="hr-card hr-list-card">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>รายชื่อพนักงาน</h3><p>ค้นหาชื่อหรือแผนก แล้วเลือกคนที่ต้องการจัดการ</p></div>
              <button type="button" className="hr-primary" onClick={() => setShowEmployeeForm(true)}>
                <Plus size={18} /> เพิ่มพนักงาน
              </button>
            </div>
            {employees.length > 0 && <label className="hr-list-search">
              <Search size={19} />
              <input type="search" aria-label="ค้นหาพนักงาน" value={employeeQuery}
                placeholder="ค้นหาชื่อ ชื่อเล่น รหัส หรือแผนก"
                onChange={event => setEmployeeQuery(event.target.value)} />
            </label>}
            {!employees.length ? <div className="hr-empty-state hr-empty-state--large">
              <Users size={30} />
              <strong>ยังไม่มีพนักงานในตัวอย่าง</strong>
              <p>เริ่มจากเพิ่มพนักงานคนแรก แล้วจึงกำหนดตารางงานให้ได้</p>
              <button type="button" className="hr-secondary" onClick={() => setShowEmployeeForm(true)}>
                <Plus size={17} /> เพิ่มพนักงานคนแรก
              </button>
            </div> : !filteredEmployees.length ? <div className="hr-empty-state">
              <Search size={25} /><strong>ไม่พบพนักงานที่ค้นหา</strong>
              <button type="button" className="hr-secondary" onClick={() => setEmployeeQuery('')}>ล้างคำค้นหา</button>
            </div> : <div className="hr-table-wrap">
              <table><thead><tr><th>พนักงาน</th><th>แผนก / ตำแหน่ง</th><th>เวลาทำงาน</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
                <tbody>{filteredEmployees.map(employee => <tr key={employee.id}>
                  <td><strong className="hr-table-main">{employee.firstName} {employee.lastName}</strong>
                    <small>{employee.code}{employee.nickname ? ' · ' + employee.nickname : ''}</small></td>
                  <td>{employee.department}<small>{employee.position}</small></td>
                  <td>{employee.workPattern === 'office' ? 'สำนักงาน' : 'ภาคสนาม'}</td>
                  <td><span className={'hr-inline-status ' + (employee.active ? 'hr-inline-status--on' : 'hr-inline-status--off')}>
                    <span className="hr-inline-status__dot" />{employee.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td>
                  <td className="hr-table-actions">
                    <button type="button" className="hr-text-button" onClick={() =>
                      setOpenEmployeeId(employee.id === openEmployeeId ? null : employee.id)}>ดูข้อมูล</button>
                  </td></tr>)}</tbody>
              </table>
            </div>}
            {employees.length > 0 && <p className="hr-list-count">แสดง {filteredEmployees.length} จาก {employees.length} คน</p>}
          </section>}
          {!showEmployeeForm && focusedEmployee && <section className="hr-card hr-detail-card">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>{focusedEmployee.firstName} {focusedEmployee.lastName}</h3>
                <p>รหัส {focusedEmployee.code}{focusedEmployee.nickname ? ' · ' + focusedEmployee.nickname : ''}</p></div>
              <button type="button" className="hr-icon-button" aria-label="ปิดรายละเอียด" onClick={() => setOpenEmployeeId(null)}>
                <X size={20} /></button>
            </div>
            <div className="hr-detail-grid">
              <div><span>แผนก</span><strong>{focusedEmployee.department}</strong></div>
              <div><span>ตำแหน่ง</span><strong>{focusedEmployee.position}</strong></div>
              <div><span>วันเริ่มงาน</span><strong>{prettyDate(focusedEmployee.startDate)}</strong></div>
              <div><span>ลักษณะงาน</span><strong>{focusedEmployee.workPattern === 'office' ? 'สำนักงาน · จันทร์–ศุกร์' : 'ภาคสนาม · จันทร์–เสาร์'}</strong></div>
            </div>
            <div className="hr-inline-actions">
              <button type="button" className="hr-primary" onClick={() => {
                setSelectedEmployee(focusedEmployee.id); navigate('schedules');
              }}><CalendarDays size={18} /> จัดตารางงาน</button>
              <button type="button" className="hr-secondary" onClick={() => {
                setEmployees(prev => prev.map(item => item.id === focusedEmployee.id
                  ? { ...item, active: !item.active } : item));
              }}>{focusedEmployee.active ? 'ปิดใช้งานพนักงาน' : 'เปิดใช้งานพนักงาน'}</button>
            </div>
          </section>}
          {showEmployeeForm && <section className="hr-card hr-edit-panel">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>เพิ่มพนักงานใหม่</h3><p>กรอกเฉพาะข้อมูลที่จำเป็นสำหรับการจัดตารางงาน</p></div>
              <button type="button" className="hr-icon-button" onClick={() => setShowEmployeeForm(false)} aria-label="ปิดฟอร์มเพิ่มพนักงาน">
                <X size={20} /></button>
            </div>
            <form className="hr-form" onSubmit={createEmployee}>
              <div className="hr-form-grid">
                <label>รหัสพนักงาน<input name="code" required placeholder="เช่น EMP001" /></label>
                <label>ชื่อ<input name="firstName" required /></label>
                <label>นามสกุล<input name="lastName" required /></label>
                <label>ชื่อเล่น<input name="nickname" /></label>
                <label>แผนก<input name="department" required /></label>
                <label>ตำแหน่ง<input name="position" required /></label>
                <label>วันที่เริ่มงาน<input name="startDate" type="date" required defaultValue={today} /></label>
                <label>ลักษณะงาน<select name="workPattern" defaultValue="office">
                  <option value="office">สำนักงาน (จ.–ศ.)</option><option value="field">ช่าง / ภาคสนาม (จ.–ส.)</option>
                </select></label>
                <label>ตารางงาน<select name="scheduleType" defaultValue="byJob">
                  <option value="morning">เช้า</option><option value="afternoon">บ่าย</option>
                  <option value="night">กลางคืน</option><option value="byJob">ตามงาน</option>
                </select></label>
              </div>
              <div className="hr-inline-actions">
                <button type="button" className="hr-secondary" onClick={() => setShowEmployeeForm(false)}>ยกเลิก</button>
                <button className="hr-primary" type="submit"><Plus size={18} /> เพิ่มพนักงาน</button>
              </div>
            </form>
          </section>}
        </>}
        {tab === 'schedules' && <>
          <section className="hr-card hr-step-card">
            <div className="hr-card-heading">
              <div><h3>เลือกคนและวันที่ต้องการจัดการ</h3>
                <p>เลือกพนักงานก่อน แล้วดูตารางที่ใช้ในวันนั้นได้ทันที</p></div>
            </div>
            <div className="hr-form-grid hr-form-grid--two">
              <label>พนักงาน<select value={selectedEmployee} onChange={event => setSelectedEmployee(event.target.value)}>
                <option value="">เลือกพนักงาน</option>
                {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.code} — {e.firstName}</option>)}
              </select></label>
              <label>วันที่<input type="date" value={workday} onChange={event => setWorkday(event.target.value)} /></label>
            </div>
            {chosenShift ? <div className="hr-status-info"><CalendarDays size={19} />
              ตารางปัจจุบัน: <strong>{showShift(chosenShift)}</strong></div> :
              <div className="hr-inline-tip"><Info size={18} /> ยังไม่มีพนักงานให้เลือก
                <button type="button" className="hr-text-button" onClick={() => navigate('employees')}>ไปเพิ่มพนักงาน</button>
              </div>}
            <div className="hr-inline-actions">
              <button type="button" className="hr-primary" disabled={!selected}
                onClick={() => setShowShiftForm(true)}><Plus size={18} /> กำหนดตารางวันนี้</button>
            </div>
          </section>
          {showShiftForm && <section className="hr-card hr-edit-panel">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>กำหนดตารางรายวัน</h3><p>สำหรับ {selected ? selected.firstName : 'พนักงานที่เลือก'} · {prettyDate(workday)}</p></div>
              <button type="button" className="hr-icon-button" aria-label="ปิดฟอร์มตารางงาน"
                onClick={() => setShowShiftForm(false)}><X size={20} /></button>
            </div>
            <form className="hr-form" onSubmit={createShift}>
              <div className="hr-form-grid">
                <label>วันที่<input type="date" name="date" required value={workday}
                  onChange={event => setWorkday(event.target.value)} /></label>
                <label>ประเภทวัน<select name="kind" defaultValue="work">
                  <option value="work">วันทำงาน</option><option value="off">วันหยุดตามตาราง</option>
                  <option value="holiday">วันหยุดบริษัท</option>
                </select></label>
                <label>เวลาเข้า<input name="startTime" type="time" defaultValue="08:00" /></label>
                <label>เวลาออก<input name="endTime" type="time" defaultValue="17:00" /></label>
                <label>งานที่ได้รับ<input name="title" placeholder="เช่น ติดตั้งอุปกรณ์" /></label>
              </div>
              <div className="hr-inline-actions">
                <button type="button" className="hr-secondary" onClick={() => setShowShiftForm(false)}>ยกเลิก</button>
                <button type="submit" className="hr-primary" disabled={!selected}>บันทึกตาราง</button>
              </div>
            </form>
          </section>}
          <section className="hr-card hr-list-card">
            <div className="hr-card-heading"><div><h3>ตารางที่กำหนดไว้</h3>
              <p>รายการที่กำหนดเองในตัวอย่าง ({shifts.length} รายการ)</p></div></div>
            {!shifts.length ? <div className="hr-empty-state"><CalendarDays size={26} />
              <strong>ยังไม่ได้กำหนดตารางเพิ่มเติม</strong>
              <p>เลือกพนักงานด้านบน แล้วกดกำหนดตารางวันนี้</p></div> :
              <div className="hr-table-wrap"><table>
                <thead><tr><th>พนักงาน</th><th>วันที่</th><th>ตาราง</th><th>จัดการ</th></tr></thead>
                <tbody>{shifts.map(item => <tr key={item.employeeId + item.shift.date}>
                  <td>{selectedName(item.employeeId)}</td><td>{prettyDate(item.shift.date)}</td>
                  <td>{showShift(item.shift)}</td>
                  <td><button type="button" className="hr-text-button" onClick={() =>
                    setShifts(prev => prev.filter(x => x !== item))}>ลบรายการ</button></td>
                </tr>)}</tbody>
              </table></div>}
          </section>
        </>}
        {tab === 'holidays' && <>
          {!showHolidayForm && <section className="hr-card hr-list-card">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>วันหยุดบริษัท</h3><p>ตรวจสอบวันหยุดที่ใช้กับตารางงานและการลา</p></div>
              <button type="button" className="hr-primary" onClick={() => setShowHolidayForm(true)}>
                <Plus size={18} /> เพิ่มวันหยุด
              </button>
            </div>
            {!holidays.length ? <div className="hr-empty-state hr-empty-state--large">
              <CalendarOff size={30} /><strong>ยังไม่มีวันหยุดบริษัทในตัวอย่าง</strong>
              <p>เพิ่มวันที่ต้องการเพื่อใช้คำนวณตารางงานทดลอง</p>
            </div> : <div className="hr-holiday-list">
              {holidays.map(date => <div key={date}>
                <span><CalendarDays size={18} /> {prettyDate(date)}</span>
                <button type="button" className="hr-text-button" onClick={() =>
                  setHolidays(current => current.filter(item => item !== date))}>ลบวันหยุด</button>
              </div>)}
            </div>}
          </section>}
          {showHolidayForm && <section className="hr-card hr-edit-panel">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>เพิ่มวันหยุด</h3><p>เลือกวันที่ต้องการเพิ่มในปฏิทินบริษัทตัวอย่าง</p></div>
              <button type="button" className="hr-icon-button" aria-label="ปิดฟอร์มวันหยุด"
                onClick={() => setShowHolidayForm(false)}><X size={20} /></button>
            </div>
            <form className="hr-form" onSubmit={addHoliday}>
              <div className="hr-form-grid hr-form-grid--two">
                <label>วันที่<input type="date" name="holiday" defaultValue={today} required /></label>
              </div>
              <div className="hr-inline-actions">
                <button type="button" className="hr-secondary" onClick={() => setShowHolidayForm(false)}>ยกเลิก</button>
                <button type="submit" className="hr-primary"><Plus size={18} /> บันทึกวันหยุด</button>
              </div>
            </form>
          </section>}
          <p className="hr-helper-note">ปฏิทินบริษัทจาก Google Calendar ยังไม่ได้เชื่อมต่อ — รายการนี้เป็นข้อมูลทดลองเท่านั้น</p>
        </>}
        {tab === 'leave' && <>
          {!showLeaveForm && <section className="hr-card hr-list-card">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>จัดการคำขอลา</h3><p>ตรวจใบลาที่รออนุมัติก่อน แล้วค่อยดูรายการย้อนหลัง</p></div>
              <button type="button" className="hr-secondary" onClick={() => setShowLeaveForm(true)}>
                <Plus size={18} /> สร้างใบลาทดลอง
              </button>
            </div>
            <div className="hr-filter-tabs" role="group" aria-label="กรองสถานะใบลา">
              <button type="button" className={leaveFilter === 'pending' ? 'active' : ''}
                aria-pressed={leaveFilter === 'pending'} onClick={() => setLeaveFilter('pending')}>
                รออนุมัติ <span>{pendingCount}</span>
              </button>
              <button type="button" className={leaveFilter === 'all' ? 'active' : ''}
                aria-pressed={leaveFilter === 'all'} onClick={() => setLeaveFilter('all')}>
                ทั้งหมด <span>{leaves.length}</span>
              </button>
            </div>
            {!filteredLeaves.length ? <div className="hr-empty-state hr-empty-state--large">
              <ClipboardList size={30} />
              <strong>{leaveFilter === 'pending' ? 'ไม่มีใบลาที่รออนุมัติ' : 'ยังไม่มีคำขอลาทดลอง'}</strong>
              <p>{leaveFilter === 'pending' ? 'คำขอที่อนุมัติแล้วอยู่ในแท็บทั้งหมด' :
                'เมื่อมีคำขอลา รายการจะแสดงที่นี่เพื่อให้ตรวจสอบได้'}</p>
              {leaveFilter === 'pending' && leaves.length > 0 &&
                <button type="button" className="hr-secondary" onClick={() => setLeaveFilter('all')}>ดูใบลาทั้งหมด</button>}
            </div> : <div className="hr-table-wrap">
              <table><thead><tr><th>พนักงาน</th><th>ประเภท</th><th>ช่วงวันที่</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
                <tbody>{filteredLeaves.map(request => <tr key={request.id}>
                  <td><strong className="hr-table-main">{selectedName(request.employeeId)}</strong></td>
                  <td>{request.type}</td>
                  <td>{prettyDate(request.startDate)} – {prettyDate(request.endDate)}
                    <small>{request.portion === 'full' ? 'เต็มวัน' : request.portion === 'morning' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย'}</small>
                  </td>
                  <td><span className={'hr-leave-status hr-leave-status--' + request.status}>
                    {request.status === 'pending' ? 'รออนุมัติ' :
                      request.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'}</span></td>
                  <td className="hr-table-actions">
                    {request.status === 'pending' && <>
                      <button type="button" className="hr-text-button hr-text-button--approve"
                        onClick={() => setLeaves(prev => prev.map(item => item.id === request.id
                          ? { ...item, status: 'approved', reviewedAt: new Date().toISOString() } : item))}>
                        <CheckCircle2 size={15} /> อนุมัติ
                      </button>
                      <button type="button" className="hr-text-button hr-text-button--reject"
                        onClick={() => setLeaves(prev => prev.map(item => item.id === request.id
                          ? { ...item, status: 'rejected', reviewedAt: new Date().toISOString() } : item))}>
                        ไม่อนุมัติ
                      </button>
                    </>}
                    <button type="button" className="hr-text-button" onClick={() => { void downloadLeave(request); }}>
                      <FileSpreadsheet size={15} /> Excel A5
                    </button>
                  </td>
                </tr>)}</tbody>
              </table>
            </div>}
          </section>}
          {showLeaveForm && <section className="hr-card hr-edit-panel">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>สร้างใบลาทดลอง</h3><p>ใช้สำหรับตรวจหน้าจอการอนุมัติ — ไม่ส่งคำขอจริง</p></div>
              <button type="button" className="hr-icon-button" aria-label="ปิดฟอร์มสร้างใบลา"
                onClick={() => setShowLeaveForm(false)}><X size={20} /></button>
            </div>
            <form className="hr-form" onSubmit={createLeave}>
              <div className="hr-form-grid">
                <label>พนักงาน<select name="employeeId" required>
                  <option value="">เลือกพนักงาน</option>
                  {employees.map(employee => <option key={employee.id} value={employee.id}>
                    {employee.code} — {employee.firstName}</option>)}
                </select></label>
                <label>ประเภทการลา<select name="type">
                  {sampleLeaveTypes.map(type => <option key={type}>{type}</option>)}
                </select></label>
                <label>เริ่มลา<input name="startDate" type="date" defaultValue={today} required /></label>
                <label>สิ้นสุด<input name="endDate" type="date" defaultValue={today} required /></label>
                <label>ระยะเวลา<select name="portion">
                  <option value="full">เต็มวัน</option><option value="morning">ครึ่งวันเช้า</option>
                  <option value="afternoon">ครึ่งวันบ่าย</option>
                </select></label>
                <label>หมายเหตุ<input name="reason" /></label>
              </div>
              <div className="hr-inline-actions">
                <button type="button" className="hr-secondary" onClick={() => setShowLeaveForm(false)}>ยกเลิก</button>
                <button type="submit" className="hr-primary" disabled={!employees.length}>สร้างใบลา</button>
              </div>
              {!employees.length && <p className="hr-muted">ต้องเพิ่มพนักงานในหน้าพนักงานก่อน</p>}
            </form>
          </section>}
        </>}
        {tab === 'reports' && <>
          <section className="hr-card hr-report-picker">
            <div className="hr-card-heading">
              <div><h3>รายงานเวลาเข้า–ออก</h3><p>เลือกพนักงาน แล้วดูจากรายปีไปยังรายเดือนและรายวัน</p></div>
            </div>
            <div className="hr-form-grid hr-form-grid--two">
              <label>พนักงาน<select value={selectedEmployee} onChange={event => {
                setSelectedEmployee(event.target.value);
                setReportLevel('year');
              }}>
                <option value="">เลือกพนักงาน</option>
                {employees.map(employee => <option key={employee.id} value={employee.id}>
                  {employee.code} — {employee.firstName}</option>)}
              </select></label>
            </div>
            <div className="hr-report-breadcrumb" aria-label="ระดับรายงาน">
              <button type="button" aria-current={reportLevel === 'year' ? 'step' : undefined}
                onClick={() => { setShowPunchForm(false); setReportLevel('year'); }}>รายปี {year}</button>
              {reportLevel !== 'year' && <>
                <ChevronRight size={16} />
                <button type="button" aria-current={reportLevel === 'month' ? 'step' : undefined}
                  onClick={() => { setShowPunchForm(false); setReportLevel('month'); }}>เดือน {month}</button>
              </>}
              {reportLevel === 'day' && <>
                <ChevronRight size={16} />
                <span>วันที่ {prettyDate(reportDay)}</span>
              </>}
            </div>
          </section>
          {reportLevel === 'year' && <section className="hr-card hr-list-card">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>เลือกรายเดือน</h3><p>เลือกเดือนเพื่อดูบัตรตอกเวลาและรอบ OT</p></div>
              <label className="hr-year-field">ปี (ค.ศ.)
                <input type="number" min="2020" max="2100" value={year}
                  aria-label="ปีของรายงาน" onChange={event => {
                    const nextYear = Number(event.target.value);
                    if (Number.isInteger(nextYear) && nextYear >= 2020 && nextYear <= 2100) {
                      setReportMonth(String(nextYear) + '-01');
                    }
                  }} />
              </label>
            </div>
            {!selected && <p className="hr-muted">เลือกพนักงานด้านบนเพื่อดูข้อมูลรายปี</p>}
            <div className="hr-year-months" role="group" aria-label="เลือกเดือนรายงาน">
              {Array.from({ length: 12 }, (_, index) => {
                const currentMonth = String(index + 1).padStart(2, '0');
                const count = selected ? filteredPunches.filter(record =>
                  record.date.startsWith(String(year) + '-' + currentMonth)).length : 0;
                return <button type="button" key={currentMonth} onClick={() => {
                  setReportMonth(String(year) + '-' + currentMonth);
                  setReportLevel('month');
                }}>
                  <CalendarDays size={20} />
                  <strong>{new Intl.DateTimeFormat('th-TH', { month: 'long', timeZone: 'Asia/Bangkok' })
                    .format(new Date(Date.UTC(year, index, 1)))}</strong>
                  <small>{count ? count + ' รายการเวลา' : 'ยังไม่มีข้อมูล'}</small>
                  <ChevronRight size={16} />
                </button>;
              })}
            </div>
          </section>}
          {reportLevel === 'month' && <>
            <section className="hr-card hr-report-summary">
              <div className="hr-card-heading hr-card-heading--actions">
                <div><h3>รายงานประจำเดือน</h3><p>รอบ OT {prettyDate(overtimeCycleBounds(year, month).from)} – {prettyDate(overtime.through)}</p></div>
                <label className="hr-month-field">เดือน
                  <input type="month" value={reportMonth} onChange={event => {
                    if (event.target.value) setReportMonth(event.target.value);
                  }} />
                </label>
              </div>
              <div className="hr-stats">
                <article><Clock3 /><strong>{formatMinutes(overtime.minutes)}</strong><span>OT ทดลอง</span></article>
                <article><Info /><strong>{overtime.missingCheckoutCount}</strong><span>ข้อมูลเข้า–ออกไม่ครบ</span></article>
                <article><ShieldCheck /><strong>{overtime.pendingHrReviewCount}</strong><span>รอ HR ตรวจ</span></article>
              </div>
            </section>
            {!showPunchForm && <section className="hr-card hr-list-card">
              <div className="hr-card-heading hr-card-heading--actions">
                <div><h3>บัตรตอกเวลารายวัน</h3><p>กดวันที่เพื่อดูรายละเอียด · แสดงทุกวันรวมวันหยุด</p></div>
                <button type="button" className="hr-secondary" disabled={!selected}
                  onClick={() => setShowPunchForm(true)}><Plus size={17} /> เพิ่มเวลาทดลอง</button>
              </div>
              {!selected ? <div className="hr-empty-state"><Users size={25} />
                <strong>เลือกพนักงานก่อน</strong></div> : <div className="hr-table-wrap">
                <table><thead><tr><th>วันที่</th><th>เข้า</th><th>ออก</th><th>สาย (นาที)</th><th>OT</th></tr></thead>
                  <tbody>{monthlyTimecard(year, month, filteredPunches).map(row => {
                  const shift = effectiveShift(row.date, selected.workPattern, holidaySet,
                    shifts.find(s => s.employeeId === selected.id && s.shift.date === row.date)?.shift);
                  const otResult = row.record && row.checkOut
                    ? sumOvertimeCycle([row.record], year, month, holidaySet, selected.workPattern, overrides) : null;
                  const ot = otResult && otResult.pendingHrReviewCount === 0 && otResult.missingCheckoutCount === 0
                    ? otResult.minutes : null;
                  const originalLate = row.record ? latenessMinutes(row.record.checkIn, shift) : null;
                  const late = row.record ? latenessMinutes(row.record.checkIn, shift, Boolean(lateExemptions[row.record.id])) : null;
                  return <tr key={row.date}>
                    <td><button type="button" className="hr-date-link" onClick={() => {
                      setReportDay(row.date);
                      setReportLevel('day');
                    }}>{prettyDate(row.date)} <ChevronRight size={15} /></button></td>
                    <td>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{late ?? '—'}
                      {row.record && originalLate !== null && originalLate > 0 && (
                        lateExemptions[row.record.id]
                          ? <small>ยกเว้น: {lateExemptions[row.record.id]}</small>
                          : <button type="button" className="hr-text-button" onClick={() => {
                              setEditingExemptionId(row.record?.id ?? null); setExemptionReason('');
                            }}>HR ยกเว้น</button>
                      )}
                      {row.record && editingExemptionId === row.record.id && (
                        <form className="hr-excuse" onSubmit={event => {
                          event.preventDefault();
                          if (!exemptionReason.trim()) return;
                          setLateExemptions(prev => ({ ...prev, [row.record!.id]: exemptionReason.trim() }));
                          setEditingExemptionId(null); setExemptionReason('');
                        }}>
                          <input type="text" required placeholder="เหตุผลที่ HR ยกเว้น" value={exemptionReason}
                            onChange={event => setExemptionReason(event.target.value)} />
                          <button type="submit" className="hr-text-button">บันทึกเหตุผล</button>
                        </form>
                      )}
                    </td>
                    <td>{ot === null ? '—' : formatMinutes(ot)}
                      {row.record?.manualOut && !row.record.hrReviewed && (
                        <button type="button" className="hr-text-button" onClick={() => {
                          setPunches(prev => prev.map(item => item.id === row.record!.id ? { ...item, hrReviewed: true } : item));
                        }}>HR ตรวจแล้ว</button>
                      )}
                    </td>
                  </tr>;
                })}</tbody>
                </table>
              </div>}
            </section>}
            {showPunchForm && <section className="hr-card hr-edit-panel">
              <div className="hr-card-heading hr-card-heading--actions">
                <div><h3>เพิ่มข้อมูลเวลาเพื่อทดสอบ</h3><p>ข้อมูลตัวอย่าง ไม่บันทึกการตอกบัตรจริง</p></div>
                <button type="button" className="hr-icon-button" aria-label="ปิดฟอร์มเพิ่มเวลา"
                  onClick={() => setShowPunchForm(false)}><X size={20} /></button>
              </div>
              <form className="hr-form" onSubmit={addPunch}>
                <div className="hr-form-grid">
                  <label>วันทำงาน<input name="date" type="date" defaultValue={today} required /></label>
                  <label>เวลาเข้า<input name="inTime" type="time" /></label>
                  <label>เวลาออก<input name="outTime" type="time" /></label>
                  <label className="hr-check"><input name="nextDay" type="checkbox" /> เวลาออกเป็นวันถัดไป</label>
                  <label className="hr-check"><input name="manual" type="checkbox" /> พนักงานกรอกย้อนหลัง (รอ HR ตรวจ)</label>
                </div>
                <div className="hr-inline-actions">
                  <button type="button" className="hr-secondary" onClick={() => setShowPunchForm(false)}>ยกเลิก</button>
                  <button type="submit" className="hr-primary" disabled={!selected}>เพิ่มรายการทดสอบ</button>
                </div>
              </form>
            </section>}
          </>}
          {reportLevel === 'day' && <section className="hr-card hr-day-details">
            <div className="hr-card-heading hr-card-heading--actions">
              <div><h3>รายละเอียดวันที่ {prettyDate(reportDay)}</h3>
                <p>{selected ? selected.firstName + ' ' + selected.lastName : 'กรุณาเลือกพนักงาน'}</p></div>
              <button type="button" className="hr-secondary" onClick={() => setReportLevel('month')}>
                <ArrowLeft size={16} /> กลับรายเดือน
              </button>
            </div>
            {(() => {
              const record = filteredPunches.find(item => item.date === reportDay);
              const time = (value: string | null | undefined) => value
                ? new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok',
                  hour: '2-digit', minute: '2-digit' }) : '—';
              return <div className="hr-day-grid">
                <div><span>เวลาเข้า</span><strong>{time(record?.checkIn)}</strong></div>
                <div><span>เวลาออก</span><strong>{time(record?.checkOut)}</strong></div>
                <div><span>ข้อมูล</span><strong>{record ? 'มีรายการทดลอง' : 'ยังไม่มีรายการ'}</strong></div>
              </div>;
            })()}
          </section>}
          <p className="hr-helper-note">รายงานและเวลาที่แสดงเป็นข้อมูลทดลองจากหน้านี้ ยังไม่เชื่อมการลงเวลาจริงหรือระบบส่งออก Excel รายงาน</p>
        </>}
                  </main>
          <footer className="hr-footer"><RefreshCcw size={15} /> ข้อมูลทดลองจะถูกล้างเมื่อรีเฟรชหน้าเว็บ</footer>
        </div>
      </div>
    </div>
  );
}
