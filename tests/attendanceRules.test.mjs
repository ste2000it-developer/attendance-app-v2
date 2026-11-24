import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isScheduledWorkday, effectiveShift, shiftInstants, validateCheckIn, validateCheckOut,
  latenessMinutes, overtimeMinutes, overtimeCycleBounds, sumOvertimeCycle,
  fillEmptyPunch, monthlyTimecard, leaveDays, scheduledReminders, toThaiDate,
} from '../src/domain/attendanceRules.ts';

const holidays = new Set(['2026-11-25']);
const officeShift = { date: '2026-11-23', kind: 'work', startTime: '08:00', endTime: '17:00' };
const rec = {
  id: 'r1', employeeId: 'emp1', date: '2026-11-23',
  checkIn: '2026-11-23T11:00:00Z', // 18:00 Bangkok
  checkOut: '2026-11-24T00:15:00Z', // 07:15 Bangkok next day
};

test('default office and field schedules honour weekday and company holidays', () => {
  assert.equal(isScheduledWorkday('2026-11-23', 'office', holidays), true);
  assert.equal(isScheduledWorkday('2026-11-28', 'office', holidays), false); // Saturday
  assert.equal(isScheduledWorkday('2026-11-28', 'field', holidays), true);
  assert.equal(isScheduledWorkday('2026-11-29', 'field', holidays), false);
  assert.equal(isScheduledWorkday('2026-11-25', 'office', holidays), false);
  assert.deepEqual(effectiveShift('2026-11-23', 'office', holidays).startTime, '08:00');
  assert.equal(effectiveShift('2026-11-23', 'field', holidays).startTime, undefined);
  assert.equal(effectiveShift('2026-11-28', 'field', holidays, {
    date: '2026-11-28', kind: 'work', startTime: '20:00', endTime: '04:00',
  }).kind, 'work');
  const overnight = shiftInstants({ date: '2026-11-28', kind: 'work', startTime: '20:00', endTime: '04:00' });
  assert.equal((overnight.end - overnight.start) / 3600000, 8);
});

test('check in at every enabled site, disabled site rejected, check out anywhere', () => {
  const sites = [
    { id: 'a', name: 'A', latitude: 13, longitude: 100, radiusMeters: 100, enabled: true },
    { id: 'b', name: 'B', latitude: 13.01, longitude: 100, radiusMeters: 100, enabled: true },
    { id: 'c', name: 'C', latitude: 14, longitude: 100, radiusMeters: 100, enabled: false },
  ];
  assert.equal(validateCheckIn({ latitude: 13, longitude: 100, accuracyMeters: 5 }, sites).site.id, 'a');
  assert.equal(validateCheckIn({ latitude: 13.01, longitude: 100, accuracyMeters: 5 }, sites).status, 'allowed');
  assert.equal(validateCheckIn({ latitude: 14, longitude: 100, accuracyMeters: 5 }, sites).status, 'outside');
  assert.equal(validateCheckIn({ latitude: 13, longitude: 100, accuracyMeters: 999 }, sites).status, 'retry');
  assert.equal(validateCheckIn(null, sites).status, 'retry');
  assert.equal(validateCheckOut({ latitude: -2, longitude: 140, accuracyMeters: 90 }).allowed, true);
  assert.equal(validateCheckOut(null).allowed, false);
});

test('zero-minute grace, explicit HR exemption', () => {
  assert.equal(latenessMinutes('2026-11-23T01:00:00Z', officeShift), 0); // 08:00
  assert.equal(latenessMinutes('2026-11-23T01:01:00Z', officeShift), 1); // 08:01
  assert.equal(latenessMinutes('2026-11-23T01:01:00Z', officeShift, true), 0);
});

test('OT starts at 19:00 and continues after midnight past 06:00', () => {
  assert.equal(overtimeMinutes(rec, false), 735);
  assert.equal(overtimeMinutes({ ...rec, checkOut: null }, false), null);
  assert.equal(overtimeMinutes({ ...rec, manualOut: true }, false), null);
  assert.equal(overtimeMinutes({ ...rec, manualOut: true, hrReviewed: true }, false), 735);
  const holidayRec = { ...rec, checkIn: '2026-11-23T01:00:00Z', checkOut: '2026-11-23T05:00:00Z' };
  assert.equal(overtimeMinutes(holidayRec, true), 240);
});

test('OT summaries cycle 25th to 24th, and do not invent missing exit', () => {
  assert.deepEqual(overtimeCycleBounds(2026, 11), { from: '2026-11-25', through: '2026-12-24' });
  assert.deepEqual(overtimeCycleBounds(2026, 12), { from: '2026-12-25', through: '2027-01-24' });
  const rows = [
    { ...rec, date: '2026-11-24' }, // excluded
    { ...rec, id: 'in', date: '2026-11-25', checkIn: '2026-11-25T11:00:00Z', checkOut: '2026-11-26T00:15:00Z' }, // included
    { ...rec, id: 'miss', date: '2026-12-24', checkOut: null },
    { ...rec, id: 'after', date: '2026-12-25' }, // excluded
  ];
  const result = sumOvertimeCycle(rows, 2026, 11, new Set());
  assert.equal(result.minutes, 735);
  assert.equal(result.missingCheckoutCount, 1);
});

test('employees may fill only empty fields with recorded HR audit', () => {
  const row = { ...rec, checkOut: null };
  const { record, audit } = fillEmptyPunch(row, 'checkOut', '2026-11-24T00:15:00Z', '2026-11-24T01:00:00Z');
  assert.equal(record.checkOut, '2026-11-24T00:15:00Z');
  assert.equal(record.manualOut, true);
  assert.equal(record.hrReviewed, false);
  assert.equal(audit.requiresHrReview, true);
  assert.throws(() => fillEmptyPunch(record, 'checkOut', '2026-11-24T01:00:00Z', '2026-11-24T01:00:00Z'));
  assert.equal(monthlyTimecard(2026, 11, [row]).length, 30);
  assert.equal(monthlyTimecard(2026, 11, [row])[22].editOut, true);
});

test('leave full day or half day counts workdays but not scheduled days off', () => {
  const leave = { startDate: '2026-11-27', endDate: '2026-11-30', portion: 'full' };
  assert.equal(leaveDays(leave, 'office', holidays), 2);
  assert.equal(leaveDays(leave, 'field', holidays), 3);
  assert.equal(leaveDays({ startDate: '2026-11-25', endDate: '2026-11-25', portion: 'morning' }, 'office', holidays), 0);
  assert.equal(leaveDays({ startDate: '2026-11-26', endDate: '2026-11-26', portion: 'afternoon' }, 'office', holidays), 0.5);
  assert.throws(() => leaveDays({ ...leave, portion: 'morning' }, 'office', holidays));
});

test('reminders include OT hourly across midnight, suppressed for holiday', () => {
  const shift = { date: '2026-11-23', kind: 'work', startTime: '08:00', endTime: '17:00' };
  const result = scheduledReminders(shift, { checkIn: '2026-11-23T01:00:00Z', checkOut: null }, '2026-11-24T00:00:00Z');
  assert.ok(result.some(x => x.type === 'in-30'));
  assert.ok(result.some(x => x.type === 'out-now'));
  assert.ok(result.some(x => x.type === 'ot-hourly' && x.at === '2026-11-23T13:00:00.000Z')); // 20:00
  assert.ok(result.some(x => x.type === 'ot-hourly' && x.at === '2026-11-24T00:00:00.000Z')); // 07:00
  const rest = scheduledReminders(shift, { checkIn: '2026-11-23T01:00:00Z', checkOut: null }, '2026-11-24T00:00:00Z', false);
  assert.equal(rest.some(x => x.type === 'ot-hourly'), false);
  assert.equal(toThaiDate('2026-11-23T20:00:00Z'), '2026-11-24');
});
