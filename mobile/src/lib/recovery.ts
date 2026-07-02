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

// Map an anatomical muscle name (e.g. from the catalog: "Quadriceps femoris") to a group.
const GROUP_KEYWORDS: [RegExp, MuscleGroup][] = [
  [/quad|hamstring|glute|calf|calv|adductor|abductor|\bleg/i, 'Legs'],
  [/pec|chest/i, 'Chest'],
  [/lat|trap|rhomboid|erector|spinae|\bback/i, 'Back'],
  [/delt|shoulder/i, 'Shoulders'],
  [/bicep|tricep|brachii|forearm|\barm/i, 'Arms'],
  [/abdom|oblique|\babs?\b|core/i, 'Core'],
];
function muscleToGroup(m: string): MuscleGroup | null {
  for (const [re, g] of GROUP_KEYWORDS) if (re.test(m)) return g;
  return null;
}

// Estimated recovery per muscle group from the real workout log.
// 0% = just trained (fatigued) → 100% = fully recovered / rested.
export function computeMuscleRecovery(workouts: WorkoutRecord[], now: number = Date.now()): MuscleRecovery[] {
  // Latest timestamp each group was trained.
  const lastTrained: Partial<Record<MuscleGroup, number>> = {};
  const mark = (g: MuscleGroup, ts: number) => { if (!lastTrained[g] || ts > lastTrained[g]!) lastTrained[g] = ts; };

  for (const w of workouts) {
    if (w.loggedExercises?.length) {
      // Structured history: use each exercise's real muscles, mapped to a group.
      for (const ex of w.loggedExercises) {
        const groups = new Set<MuscleGroup>();
        (ex.muscles ?? []).forEach(m => { const g = muscleToGroup(m); if (g) groups.add(g); });
        if (groups.size === 0) exerciseMuscles(ex.name).forEach(g => groups.add(g));
        groups.forEach(g => mark(g, w.timestamp));
      }
    } else {
      // Fallback (seed / legacy): keyword-map the exercise-name string.
      (w.exercises || '').split(',').forEach(n => exerciseMuscles(n).forEach(g => mark(g, w.timestamp)));
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
