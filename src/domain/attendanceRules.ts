/**
 * Attendance V2 company rules.
 * Pure, testable calculations. This module NEVER writes or reads employee data.
 * Server validation, credentials and access control are required before real use.
 */
export type EmployeeWorkPattern = 'office' | 'field';
export type ShiftKind = 'work' | 'off' | 'holiday';
export type DayShift = {
  date: string; // YYYY-MM-DD, Asia/Bangkok
  kind: ShiftKind;
  startTime?: string; // HH:mm, in Bangkok
  endTime?: string; // HH:mm, in Bangkok; may be the following day
  title?: string;
  siteId?: string;
};
export type Employee = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  department: string;
  position: string;
  startDate: string;
  scheduleType: 'morning' | 'afternoon' | 'night' | 'byJob';
  workPattern: EmployeeWorkPattern;
  active: boolean;
};
export type GeoReading = { latitude: number; longitude: number; accuracyMeters: number };
export type Worksite = { id: string; name: string; latitude: number; longitude: number; radiusMeters: number; enabled: boolean };
export type LocationDecision = {
  status: 'allowed' | 'outside' | 'retry';
  site: Worksite | null;
  distanceMeters: number | null;
  accuracyMeters: number | null;
  note: string;
};
export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string; // Work shift date; stays the same if check-out is after midnight
  checkIn: string | null; // ISO instant with explicit offset or Z
  checkOut: string | null;
  checkInSiteId?: string;
  checkInLocation?: GeoReading;
  checkOutLocation?: GeoReading;
  manualIn?: boolean;
  manualOut?: boolean;
  hrReviewed?: boolean;
};
export type BackfillField = 'checkIn' | 'checkOut';
export type BackfillAudit = {
  recordId: string;
  employeeId: string;
  field: BackfillField;
  oldValue: null;
  newValue: string;
  submittedAt: string;
  requiresHrReview: true;
};
export type LeaveType =
  | 'ลาพักร้อนประจำปี' | 'ลาป่วย' | 'ลาเพื่อฝึกอบรม/พัฒนาความรู้'
  | 'ลารับราชการทหาร' | 'ลาอุปสมบท' | 'ลาคลอด'
  | 'ลาเพื่อทำหมัน' | 'ลากิจโดยไม่รับค่าจ้าง' | 'ลาฉุกเฉิน' | 'อื่น ๆ';
export type LeavePortion = 'full' | 'morning' | 'afternoon';
export type LeaveRequest = {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  portion: LeavePortion;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
};

const DATE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const MS_MIN = 60_000;
const MS_DAY = 86_400_000;
const TZ_OFFSET = 7 * 60 * MS_MIN;

/** Date-only calculations are stable in Thailand's UTC+7 timezone, including midnight. */
export function parseDate(date: string): number {
  if (!DATE.test(date)) throw new Error('รูปแบบวันที่ต้องเป็น YYYY-MM-DD');
  const parsed = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) {
    throw new Error('วันที่ไม่ถูกต้อง');
  }
  return parsed;
}
export function bangkokInstant(date: string, clock: string, followingDay = false): number {
  if (!CLOCK.test(clock)) throw new Error('รูปแบบเวลาต้องเป็น HH:mm');
  const [h, m] = clock.split(':').map(Number);
  return parseDate(date) + (followingDay ? MS_DAY : 0) + (h * 60 + m) * MS_MIN - TZ_OFFSET;
}
export function toThaiDate(instant: string | number | Date): string {
  const value = instant instanceof Date ? instant.getTime() : typeof instant === 'string' ? Date.parse(instant) : instant;
  if (!Number.isFinite(value)) throw new Error('เวลาที่ระบุไม่ถูกต้อง');
  return new Date(value + TZ_OFFSET).toISOString().slice(0, 10);
}
export function nextThaiDay(date: string, offset: number): string {
  return new Date(parseDate(date) + offset * MS_DAY).toISOString().slice(0, 10);
}
function parseInstant(iso: string): number {
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(iso)) throw new Error('ต้องระบุเขตเวลาของวันที่จริง');
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) throw new Error('วันที่และเวลาไม่ถูกต้อง');
  return value;
}
export function isScheduledWorkday(date: string, pattern: EmployeeWorkPattern, companyHolidays: ReadonlySet<string>): boolean {
  if (companyHolidays.has(date)) return false;
  const day = new Date(parseDate(date)).getUTCDay();
  return pattern === 'office' ? day >= 1 && day <= 5 : day >= 1 && day <= 6;
}
export function effectiveShift(date: string, pattern: EmployeeWorkPattern,
  companyHolidays: ReadonlySet<string>, override?: DayShift | null): DayShift {
  parseDate(date);
  if (override) {
    if (override.date !== date) throw new Error('วันที่ตารางงานไม่ตรงกัน');
    return override;
  }
  if (!isScheduledWorkday(date, pattern, companyHolidays)) {
    return { date, kind: companyHolidays.has(date) ? 'holiday' : 'off' };
  }
  return pattern === 'office'
    ? { date, kind: 'work', startTime: '08:00', endTime: '17:00', title: 'งานออฟฟิศ' }
    : { date, kind: 'work', title: 'รอกำหนดเวลาตามงาน' };
}
export function shiftInstants(shift: DayShift): { start: number; end: number } | null {
  if (shift.kind !== 'work' || !shift.startTime || !shift.endTime) return null;
  const start = bangkokInstant(shift.date, shift.startTime);
  const end = bangkokInstant(shift.date, shift.endTime, shift.endTime <= shift.startTime);
  return { start, end };
}
function validGeo(geo: GeoReading): boolean {
  return Number.isFinite(geo.latitude) && Math.abs(geo.latitude) <= 90
    && Number.isFinite(geo.longitude) && Math.abs(geo.longitude) <= 180
    && Number.isFinite(geo.accuracyMeters) && geo.accuracyMeters >= 0;
}
/** Great-circle distance in meters. */
export function geoDistanceMeters(a: Pick<GeoReading, 'latitude' | 'longitude'>,
  b: Pick<GeoReading, 'latitude' | 'longitude'>): number {
  const rad = Math.PI / 180, earth = 6_371_000;
  const dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const t = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad)
    * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(t), Math.sqrt(1 - t));
}
export function validateCheckIn(geo: GeoReading | null, sites: readonly Worksite[]): LocationDecision {
  const failed: LocationDecision = { status: 'retry', site: null, distanceMeters: null, accuracyMeters: null, note: 'ไม่สามารถตรวจพิกัดได้ กรุณาลองใหม่' };
  if (!geo || !validGeo(geo)) return failed;
  const active = sites.filter(site => site.enabled && site.radiusMeters > 0
    && Number.isFinite(site.radiusMeters) && validGeo({ latitude: site.latitude, longitude: site.longitude, accuracyMeters: 0 }));
  const matched = active.map(site => ({ site, distance: geoDistanceMeters(geo, site) }))
    .sort((a, b) => a.distance - b.distance);
  const inside = matched.find(item => item.distance <= item.site.radiusMeters);
  if (inside) {
    if (geo.accuracyMeters > inside.site.radiusMeters) {
      return { status: 'retry', site: inside.site, distanceMeters: inside.distance, accuracyMeters: geo.accuracyMeters, note: 'GPS คลาดเคลื่อนสูง กรุณาตรวจตำแหน่งใหม่' };
    }
    return { status: 'allowed', site: inside.site, distanceMeters: inside.distance, accuracyMeters: geo.accuracyMeters,
      note: inside.distance + geo.accuracyMeters > inside.site.radiusMeters ? 'อยู่ใกล้ขอบพื้นที่ ควรตรวจสอบความแม่นยำ GPS' : 'อยู่ในพื้นที่ที่เปิดใช้งาน' };
  }
  // If the accuracy circle touches a geofence, we cannot confidently say "outside".
  const uncertain = matched.find(item => item.distance - geo.accuracyMeters <= item.site.radiusMeters);
  if (uncertain) return { status: 'retry', site: uncertain.site, distanceMeters: uncertain.distance, accuracyMeters: geo.accuracyMeters, note: 'พิกัดคลาดเคลื่อนใกล้ขอบไซต์งาน กรุณาตรวจใหม่' };
  return { status: 'outside', site: matched[0]?.site ?? null, distanceMeters: matched[0]?.distance ?? null,
    accuracyMeters: geo.accuracyMeters, note: 'อยู่นอกพื้นที่ไซต์งานที่เปิดใช้งานทั้งหมด' };
}
/** Clock-out is location-unrestricted but still requires a valid GPS reading. */
export function validateCheckOut(geo: GeoReading | null): { allowed: boolean; note: string } {
  return validGeo(geo ?? { latitude: NaN, longitude: NaN, accuracyMeters: NaN })
    ? { allowed: true, note: 'บันทึกพิกัดตอนออกงาน' }
    : { allowed: false, note: 'ตรวจ GPS ไม่สำเร็จ กรุณาลองใหม่' };
}
export function latenessMinutes(actualIn: string | null, shift: DayShift, excusedByHr = false): number | null {
  if (!actualIn || !shift.startTime || shift.kind !== 'work') return null;
  const late = Math.max(0, Math.ceil((parseInstant(actualIn) - bangkokInstant(shift.date, shift.startTime)) / MS_MIN));
  return excusedByHr ? 0 : late; // Actual clock-in remains unchanged.
}
/** Null is unknown, never 0, until actual or HR-reviewed check-out is available. */
export function overtimeMinutes(record: AttendanceRecord, isHoliday: boolean): number | null {
  if (!record.checkIn || !record.checkOut) return null;
  if ((record.manualIn || record.manualOut) && !record.hrReviewed) return null;
  const start = parseInstant(record.checkIn), end = parseInstant(record.checkOut);
  if (end < start) throw new Error('เวลาออกงานต้องไม่ก่อนเวลาเข้างาน');
  if (isHoliday) return Math.round((end - start) / MS_MIN);
  // OT on regular working days is continuous from 19:00 of the starting shift date.
  const otStart = bangkokInstant(record.date, '19:00');
  return Math.max(0, Math.round((end - Math.max(start, otStart)) / MS_MIN));
}
/** Use this instead of a fixed 30-day offset, as real months vary. */
export function overtimeCycleBounds(year: number, month: number): { from: string; through: string } {
  const from = String(year) + '-' + String(month).padStart(2, '0') + '-25';
  parseDate(from);
  const nextMonth = new Date(Date.UTC(year, month, 24)).toISOString().slice(0, 7);
  return { from, through: nextMonth + '-24' };
}
export function sumOvertimeCycle(records: readonly AttendanceRecord[],
  year: number, month: number, holidays: ReadonlySet<string>,
  workPattern?: EmployeeWorkPattern, overrides: ReadonlyMap<string, DayShift> = new Map()) {
  const bounds = overtimeCycleBounds(year, month);
  let minutes = 0, pending = 0, unverified = 0;
  for (const row of records) {
    if (row.date < bounds.from || row.date > bounds.through) continue;
    const holiday = holidays.has(row.date)
      || (workPattern !== undefined && !isScheduledWorkday(row.date, workPattern, holidays))
      || ['off', 'holiday'].includes(overrides.get(row.date)?.kind ?? '');
    const value = overtimeMinutes(row, holiday);
    if (value === null) {
      if (!row.checkIn || !row.checkOut) pending++;
      else unverified++;
      continue;
    }
    minutes += value;
  }
  return { ...bounds, minutes, hours: Number((minutes / 60).toFixed(2)), missingCheckoutCount: pending, pendingHrReviewCount: unverified };
}
export function fillEmptyPunch(record: AttendanceRecord, field: BackfillField, iso: string, submittedAt: string):
  { record: AttendanceRecord; audit: BackfillAudit } {
  if (record[field]) throw new Error('แก้ไขได้เฉพาะช่องเวลาที่ว่าง');
  const instant = parseInstant(iso);
  parseInstant(submittedAt);
  const other = field === 'checkIn' ? record.checkOut : record.checkIn;
  if (other) {
    const otherAt = parseInstant(other);
    if ((field === 'checkIn' && instant > otherAt) || (field === 'checkOut' && instant < otherAt)) {
      throw new Error('เวลาเข้า–ออกไม่สัมพันธ์กัน');
    }
  }
  return {
    record: { ...record, [field]: iso, [field === 'checkIn' ? 'manualIn' : 'manualOut']: true, hrReviewed: false },
    audit: { recordId: record.id, employeeId: record.employeeId, field,
      oldValue: null, newValue: iso, submittedAt, requiresHrReview: true },
  };
}
export function monthlyTimecard(year: number, month: number, records: readonly AttendanceRecord[]) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('เดือนไม่ถูกต้อง');
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => {
    const date = String(year) + '-' + String(month).padStart(2, '0') + '-' + String(i + 1).padStart(2, '0');
    const record = records.find(item => item.date === date) ?? null;
    return { date, checkIn: record?.checkIn ?? null, checkOut: record?.checkOut ?? null,
      editIn: !record?.checkIn, editOut: !record?.checkOut, record };
  });
}
export function leaveDays(request: Pick<LeaveRequest, 'startDate' | 'endDate' | 'portion'>,
  pattern: EmployeeWorkPattern, holidays: ReadonlySet<string>, overrides: ReadonlyMap<string, DayShift> = new Map()): number {
  const start = parseDate(request.startDate), end = parseDate(request.endDate);
  if (end < start) throw new Error('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
  if (request.portion !== 'full' && start !== end) throw new Error('การลาครึ่งวันเลือกได้เพียงหนึ่งวัน');
  let working = 0;
  for (let cursor = start; cursor <= end; cursor += MS_DAY) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    if (effectiveShift(date, pattern, holidays, overrides.get(date)).kind === 'work') working++;
  }
  return request.portion === 'full' ? working : working ? 0.5 : 0;
}
export type Reminder = {
  at: string;
  type: 'in-30' | 'in-5' | 'in-late-5' | 'out-now' | 'out-5' | 'ot-hourly';
};
/** Generates reminder moments for a scheduler; no push is sent from the browser. */
export function scheduledReminders(shift: DayShift, record: Pick<AttendanceRecord, 'checkIn' | 'checkOut'> | null,
  horizonISO: string, isRegularWorkday = true): Reminder[] {
  const bounds = shiftInstants(shift);
  if (!bounds) return [];
  const horizon = parseInstant(horizonISO), result: Reminder[] = [];
  const add = (at: number, type: Reminder['type']) => {
    if (at <= horizon) result.push({ at: new Date(at).toISOString(), type });
  };
  add(bounds.start - 30 * MS_MIN, 'in-30');
  add(bounds.start - 5 * MS_MIN, 'in-5');
  if (!record?.checkIn || parseInstant(record.checkIn) > bounds.start + 5 * MS_MIN) add(bounds.start + 5 * MS_MIN, 'in-late-5');
  if (!record?.checkOut || parseInstant(record.checkOut) > bounds.end) add(bounds.end, 'out-now');
  if (!record?.checkOut || parseInstant(record.checkOut) > bounds.end + 5 * MS_MIN) add(bounds.end + 5 * MS_MIN, 'out-5');
  const until = record?.checkOut ? Math.min(parseInstant(record.checkOut), horizon) : horizon;
  const otStart = bangkokInstant(shift.date, '19:00') + 60 * MS_MIN;
  if (isRegularWorkday && record?.checkIn && (!record.checkOut || parseInstant(record.checkOut) > otStart)) {
    for (let at = otStart; at <= until; at += 60 * MS_MIN) add(at, 'ot-hourly');
  }
  return result.sort((a, b) => a.at.localeCompare(b.at));
}
