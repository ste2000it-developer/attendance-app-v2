export type DayPeriod = 'morning' | 'day' | 'evening' | 'night';
export type AttendanceDisplayState = 'before' | 'working' | 'finished';

const hourInThailand = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  hourCycle: 'h23',
});

export function periodForHour(hour: number): DayPeriod {
  // Bangkok: morning 05:00–07:59, midday 08:00–14:59,
  // evening 15:00–18:59, night 19:00–04:59.
  if (hour >= 5 && hour < 8) return 'morning';
  if (hour >= 8 && hour < 15) return 'day';
  if (hour >= 15 && hour < 19) return 'evening';
  return 'night';
}

export function getBangkokPeriod(date: Date): DayPeriod {
  return periodForHour(Number(hourInThailand.format(date)));
}

export const periodNames: Record<DayPeriod, string> = {
  morning: 'เช้า',
  day: 'เที่ยง',
  evening: 'เย็น',
  night: 'กลางคืน',
};

export const periodThemeColors: Record<DayPeriod, string> = {
  // Sampled from the top edge of the approved Pixel Art images.
  morning: '#43a8fd',
  day: '#34a3fd',
  evening: '#4543ad',
  night: '#022a72',
};
