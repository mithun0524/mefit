import type { WorkoutRecord, LoggedExercise } from '@/store/useAppStore';

// Epley estimated 1RM — lets us compare sets of different weight×rep schemes.
export function estimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

export type ExerciseBest = { weight: number; reps: number; e1rm: number };

// Best estimated-1RM per exercise across all logged history.
export function exerciseBests(workouts: WorkoutRecord[]): Record<string, ExerciseBest> {
  const bests: Record<string, ExerciseBest> = {};
  for (const w of workouts) {
    for (const ex of w.loggedExercises ?? []) {
      for (const s of ex.sets) {
        if (!s.completed) continue;
        const e = estimated1RM(s.weight, s.reps);
        if (e <= 0) continue;
        const cur = bests[ex.name];
        if (!cur || e > cur.e1rm) bests[ex.name] = { weight: s.weight, reps: s.reps, e1rm: e };
      }
    }
  }
  return bests;
}

// A PR = an exercise whose best set this session beats its prior all-time best
// (by estimated 1RM). First-ever weighted log for a lift counts as a PR.
export function detectPRs(prevBests: Record<string, ExerciseBest>, logged: LoggedExercise[]): { count: number; names: string[] } {
  const names: string[] = [];
  for (const ex of logged) {
    let best = 0;
    for (const s of ex.sets) if (s.completed) best = Math.max(best, estimated1RM(s.weight, s.reps));
    if (best > 0 && best > (prevBests[ex.name]?.e1rm ?? 0)) names.push(ex.name);
  }
  return { count: names.length, names };
}

// Volume-over-time for one exercise (per-session totals), oldest → newest.
export function exerciseVolumeSeries(workouts: WorkoutRecord[], name: string): { ts: number; volume: number }[] {
  return [...workouts]
    .filter(w => (w.loggedExercises ?? []).some(e => e.name === name))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(w => {
      const ex = w.loggedExercises!.find(e => e.name === name)!;
      const volume = ex.sets.reduce((s, x) => s + (x.completed ? x.weight * x.reps : 0), 0);
      return { ts: w.timestamp, volume };
    });
}
