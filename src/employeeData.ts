import { useEffect, useState } from 'react';
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';

// A Firestore document is stored at employees/{auth.uid}.
// Employee codes and names are company-managed, not copied from Google identity.
export type EmployeeRecord = {
  code: string;
  firstName: string;
  lastName: string;
  nickname: string;
  department: string;
  position: string;
  startDate: string;
  scheduleType: 'morning' | 'afternoon' | 'night' | 'byJob';
  workPattern: 'office' | 'field';
  status: 'active' | 'inactive';
};

export type WorkdayRecord = {
  kind: 'work' | 'off' | 'holiday';
  startTime: string;
  endTime: string;
  title: string;
  siteName: string;
  note: string;
};

type ReadState<T> = { data: T | null; loading: boolean; error: string | null };

const text = (data: DocumentData, key: string) =>
  typeof data[key] === 'string' ? data[key].trim() : '';

function readEmployee(data: DocumentData): EmployeeRecord {
  const schedule = text(data, 'scheduleType');
  return {
    code: text(data, 'code'),
    firstName: text(data, 'firstName'),
    lastName: text(data, 'lastName'),
    nickname: text(data, 'nickname'),
    department: text(data, 'department'),
    position: text(data, 'position'),
    startDate: text(data, 'startDate'),
    scheduleType: schedule === 'morning' || schedule === 'afternoon' || schedule === 'night'
      ? schedule : 'byJob',
    workPattern: data.workPattern === 'office' ? 'office' : 'field',
    status: data.status === 'active' ? 'active' : 'inactive',
  };
}

function readWorkday(data: DocumentData): WorkdayRecord {
  const kind = text(data, 'kind');
  return {
    kind: kind === 'holiday' || kind === 'off' ? kind : 'work',
    startTime: text(data, 'startTime'),
    endTime: text(data, 'endTime'),
    title: text(data, 'title'),
    siteName: text(data, 'siteName'),
    note: text(data, 'note'),
  };
}

export function bangkokDateISO(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (kind: string) => parts.find((part) => part.type === kind)?.value ?? '';
  return [get('year'), get('month'), get('day')].join('-');
}

export function useEmployeeRecord(uid: string | null): ReadState<EmployeeRecord> {
  const [state, setState] = useState<ReadState<EmployeeRecord>>({
    data: null, loading: Boolean(uid), error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState({ data: null, loading: true, error: null });
    return onSnapshot(doc(db, 'employees', uid), (snapshot) => {
      setState({ data: snapshot.exists() ? readEmployee(snapshot.data()) : null, loading: false, error: null });
    }, () => {
      setState({ data: null, loading: false, error: 'ไม่สามารถอ่านข้อมูลพนักงานจาก Firebase ได้' });
    });
  }, [uid]);
  return state;
}

export function useWorkday(uid: string | null, date: string): ReadState<WorkdayRecord> {
  const [state, setState] = useState<ReadState<WorkdayRecord>>({
    data: null, loading: Boolean(uid), error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState({ data: null, loading: true, error: null });
    return onSnapshot(doc(db, 'employees', uid, 'workDays', date), (snapshot) => {
      setState({ data: snapshot.exists() ? readWorkday(snapshot.data()) : null, loading: false, error: null });
    }, () => {
      setState({ data: null, loading: false, error: 'ไม่สามารถอ่านตารางงานจาก Firebase ได้' });
    });
  }, [uid, date]);
  return state;
}

const clockTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function workdayDisplay(employee: EmployeeRecord, day: WorkdayRecord | null, date: string) {
  if (day?.kind === 'off') return 'วันหยุดตามตารางงาน';
  if (day?.kind === 'holiday') return 'วันหยุดบริษัท';
  if (day?.kind === 'work') {
    const hasTime = clockTime(day.startTime) && clockTime(day.endTime);
    const shift = hasTime ? day.startTime + ' – ' + day.endTime
      + (day.endTime <= day.startTime ? ' (ข้ามวัน)' : '') : 'ยังไม่ได้ระบุเวลางาน';
    return [day.title || 'งานวันนี้', shift, day.siteName].filter(Boolean).join(' · ');
  }

  // Defaults apply only when the company has not assigned a daily override.
  // Company-calendar public/special holidays are NOT inferred here.
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
  if (employee.workPattern === 'office') {
    return weekday === 0 || weekday === 6
      ? 'วันหยุดประจำสัปดาห์'
      : 'งานออฟฟิศ · 08:00 – 17:00';
  }
  if (weekday === 0) return 'วันหยุดประจำสัปดาห์';
  return 'ยังไม่มีตารางเวลางานวันนี้';
}

export const scheduleTypeLabels: Record<EmployeeRecord['scheduleType'], string> = {
  morning: 'เช้า', afternoon: 'บ่าย', night: 'กลางคืน', byJob: 'ตามงาน',
};
