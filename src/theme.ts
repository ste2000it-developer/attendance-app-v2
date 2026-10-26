export type DayPeriod = 'morning' | 'day' | 'evening' | 'night';
export type AttendanceDisplayState = 'before' | 'working' | 'finished';

const hourInThailand = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  hourCycle: 'h23',
});

export function periodForHour(hour: number): DayPeriod {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export function getBangkokPeriod(date: Date): DayPeriod {
  return periodForHour(Number(hourInThailand.format(date)));
}

export const periodNames: Record<DayPeriod, string> = {
  morning: 'เช้า',
  day: 'กลางวัน',
  evening: 'เย็น',
  night: 'กลางคืน',
};

export const periodThemeColors: Record<DayPeriod, string> = {
  morning: '#fff7df',
  day: '#dcf2ff',
  evening: '#edafad',
  night: '#10233c',
};
