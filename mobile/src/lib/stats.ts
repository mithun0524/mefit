import type { WorkoutRecord } from '@/store/useAppStore';

const DAY = 86400000;

const pad2 = (n: number) => String(n).padStart(2, '0');
// Local-calendar day key, ISO-shaped and zero-padded: YYYY-MM-DD (month is 1-indexed).
function dayKeyD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function dayKey(ts: number): string {
  return dayKeyD(new Date(ts));
}
function sameMonth(ts: number, now: number): boolean {
  const a = new Date(ts), b = new Date(now);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export type DashboardStats = {
  weeklyK: number[];        // last 4 weeks volume (k lbs), index 3 = current week
  thisWeekK: number;
  deltaPct: number;         // this week vs last week
  prsThisMonth: number;
  workoutsThisMonth: number;
  streak: number;           // consecutive training days ending today or yesterday
  weekDots: boolean[];      // current week — trained or not, in weekLabels order
  weekLabels: string[];     // day initials in the configured week order
  daysThisWeek: number;
  hasData: boolean;
};

// Everything real is derived from the workout log — no hardcoded numbers.
export function deriveDashboardStats(workouts: WorkoutRecord[], now: number = Date.now(), firstDayMonday: boolean = true): DashboardStats {
  const weekly = [0, 0, 0, 0];
  workouts.forEach(w => {
    const bucket = Math.floor((now - w.timestamp) / (7 * DAY));
    if (bucket >= 0 && bucket < 4) weekly[3 - bucket] += w.volumeLbs;
  });
  const weeklyK = weekly.map(v => Math.round(v / 100) / 10);
  const thisWeek = weekly[3];
  const lastWeek = weekly[2];
  const deltaPct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);

  const monthly = workouts.filter(w => sameMonth(w.timestamp, now));
  const prsThisMonth = monthly.reduce((s, w) => s + (w.prs || 0), 0);
  const workoutsThisMonth = monthly.length;

  // Streak: consecutive days with a workout, allowed to end today or yesterday.
  const days = new Set(workouts.map(w => dayKey(w.timestamp)));
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKeyD(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKeyD(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Current week, starting Monday or Sunday per the user's setting.
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dow = firstDayMonday ? (today.getDay() + 6) % 7 : today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - dow);
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return days.has(dayKeyD(d));
  });
  const MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekLabels = firstDayMonday ? MON : SUN;
  const daysThisWeek = weekDots.filter(Boolean).length;

  return {
    weeklyK,
    thisWeekK: Math.round(thisWeek / 100) / 10,
    deltaPct,
    prsThisMonth,
    workoutsThisMonth,
    streak,
    weekDots,
    weekLabels,
    daysThisWeek,
    hasData: workouts.length > 0,
  };
}

export function todayKey(now: number = Date.now()): string {
  return dayKeyD(new Date(now));
}
