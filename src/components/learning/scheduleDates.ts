const timeZone = 'Asia/Ho_Chi_Minh';

export function scheduleDate(value: string | number): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export function scheduleTime(value: string | number): string {
  return new Intl.DateTimeFormat('vi-VN', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}

export function shiftDate(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function mondayOf(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return shiftDate(day, -(weekday === 0 ? 6 : weekday - 1));
}

export function scheduleDayLabel(day: string): string {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${day}T12:00:00Z`));
}

export function scheduleRange(startsAt: string, duration: number): string {
  const end = new Date(startsAt).getTime() + duration * 60000;
  return `${scheduleTime(startsAt)} – ${scheduleTime(end)}${scheduleDate(end) !== scheduleDate(startsAt) ? ' (hôm sau)' : ''}`;
}
