// Pure helpers for the live workout session — extracted so the RPE and warm-up
// rules are unit-testable (the rest of the workout screen is UI).

// RPE pill cycles 7 → 8 → 9 → 10 → off (undefined).
export function nextRpe(current?: number): number | undefined {
  if (current == null) return 7;
  if (current >= 10) return undefined;
  return current + 1;
}

type SessionSet = { weight: any; reps: any; completed?: boolean; isWarmup?: boolean };
type SessionExercise = { sets: SessionSet[] };

// Total volume of COMPLETED sets. Warm-up sets are counted only when includeWarmup.
export function sessionVolume(exercises: SessionExercise[], includeWarmup: boolean): number {
  let v = 0;
  for (const e of exercises) {
    for (const s of e.sets) {
      if (!s.completed) continue;
      if (!includeWarmup && s.isWarmup) continue;
      v += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }
  }
  return v;
}
