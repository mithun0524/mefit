import type { WorkoutRecord } from '@/store/useAppStore';

const DAY = 86400000;

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayKeyD(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
  weekDots: boolean[];      // Mon..Sun of the current week — trained or not
  daysThisWeek: number;
  hasData: boolean;
};

// Everything real is derived from the workout log — no hardcoded numbers.
export function deriveDashboardStats(workouts: WorkoutRecord[], now: number = Date.now()): DashboardStats {
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

  // Current week Mon..Sun
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(today);
  monday.setDate(monday.getDate() - dow);
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return days.has(dayKeyD(d));
  });
  const daysThisWeek = weekDots.filter(Boolean).length;

  return {
    weeklyK,
    thisWeekK: Math.round(thisWeek / 100) / 10,
    deltaPct,
    prsThisMonth,
    workoutsThisMonth,
    streak,
    weekDots,
    daysThisWeek,
    hasData: workouts.length > 0,
  };
}

export function todayKey(now: number = Date.now()): string {
  return dayKeyD(new Date(now));
}
