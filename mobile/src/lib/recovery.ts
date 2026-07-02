import type { WorkoutRecord } from '@/store/useAppStore';
import type { MuscleRecovery } from '@/lib/readiness';

// The six groups shown on the dashboard.
export const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Hours until a group is considered fully recovered (larger muscles recover slower).
const RECOVERY_HOURS: Record<MuscleGroup, number> = {
  Legs: 72,
  Back: 72,
  Chest: 60,
  Shoulders: 48,
  Arms: 48,
  Core: 36,
};

// Keyword → muscle groups. Order matters: specific phrases before generic ones.
const RULES: { re: RegExp; groups: MuscleGroup[] }[] = [
  { re: /bench|chest|\bfly\b|push[-\s]?up|\bdip\b/i, groups: ['Chest'] },
  { re: /shoulder|overhead|\bohp\b|military|lateral|\bdelt|arnold/i, groups: ['Shoulders'] },
  { re: /pull[-\s]?up|chin[-\s]?up|\brow\b|\blat\b|pulldown|pull[-\s]?down|face pull/i, groups: ['Back'] },
  { re: /deadlift|\brdl\b|romanian/i, groups: ['Back', 'Legs'] },
  { re: /squat|lunge|\bleg press\b|calf|quad|hamstring|glute|leg curl|leg extension|step[-\s]?up|hip thrust|swing/i, groups: ['Legs'] },
  { re: /curl|bicep|tricep|pushdown|skull|\bcable extension\b/i, groups: ['Arms'] },
  { re: /plank|crunch|\bab\b|\babs\b|core|leg raise|sit[-\s]?up|russian twist|hanging|mountain climber/i, groups: ['Core'] },
];

// Map a single exercise name to the muscle groups it trains.
export function exerciseMuscles(name: string): MuscleGroup[] {
  const found = new Set<MuscleGroup>();
  for (const rule of RULES) {
    if (rule.re.test(name)) rule.groups.forEach(g => found.add(g));
  }
  return [...found];
}

// Estimated recovery per muscle group from the real workout log.
// 0% = just trained (fatigued) → 100% = fully recovered / rested.
export function computeMuscleRecovery(workouts: WorkoutRecord[], now: number = Date.now()): MuscleRecovery[] {
  // Latest timestamp each group was trained.
  const lastTrained: Partial<Record<MuscleGroup, number>> = {};
  for (const w of workouts) {
    const names = (w.exercises || '').split(',');
    for (const n of names) {
      for (const g of exerciseMuscles(n)) {
        if (!lastTrained[g] || w.timestamp > lastTrained[g]!) lastTrained[g] = w.timestamp;
      }
    }
  }

  return MUSCLE_GROUPS.map(group => {
    const last = lastTrained[group];
    if (last == null) return { name: group, recovery: 100 }; // never trained recently → rested
    const hours = (now - last) / 3_600_000;
    const recovery = Math.max(0, Math.min(100, Math.round((hours / RECOVERY_HOURS[group]) * 100)));
    return { name: group, recovery };
  });
}
