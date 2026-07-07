import { test } from 'node:test';
import assert from 'node:assert/strict';

import { estimated1RM, exerciseBests, detectPRs, exerciseVolumeSeries } from '../src/lib/history';
import { computeReadiness, readinessLabel, readinessColor } from '../src/lib/readiness';
import { computeMuscleRecovery } from '../src/lib/recovery';
import { deriveDashboardStats, todayKey } from '../src/lib/stats';

// ── Minimal WorkoutRecord factory (shape matches the store) ──
const set = (weight: number, reps: number, completed = true) => ({ weight, reps, completed });
const workout = (over: any = {}) => ({
  id: over.id ?? 'w1',
  timestamp: over.timestamp ?? Date.now(),
  name: over.name ?? 'Session',
  date: over.date ?? 'Today',
  volumeLbs: over.volumeLbs ?? 0,
  prs: over.prs ?? 0,
  exercises: over.exercises ?? '',
  loggedExercises: over.loggedExercises ?? [],
  ...over,
});

// ─────────────────────────────────────────────────────────────
//  history.ts
// ─────────────────────────────────────────────────────────────
test('estimated1RM uses the Epley formula and rounds', () => {
  assert.equal(estimated1RM(100, 5), 117); // 100 * (1 + 5/30) = 116.67 → 117
  assert.equal(estimated1RM(200, 1), 207);
});

test('estimated1RM guards non-positive input', () => {
  assert.equal(estimated1RM(0, 5), 0);
  assert.equal(estimated1RM(100, 0), 0);
  assert.equal(estimated1RM(-50, 5), 0);
});

test('exerciseBests takes the best completed set per exercise', () => {
  const ws = [workout({
    loggedExercises: [
      { name: 'Bench', sets: [set(100, 5), set(120, 5), set(120, 5, false)] },
    ],
  })];
  const bests = exerciseBests(ws as any);
  assert.equal(bests['Bench'].weight, 120);
  assert.equal(bests['Bench'].e1rm, estimated1RM(120, 5));
});

test('exerciseBests ignores incomplete-only exercises', () => {
  const ws = [workout({ loggedExercises: [{ name: 'Squat', sets: [set(200, 5, false)] }] })];
  assert.equal(Object.keys(exerciseBests(ws as any)).length, 0);
});

test('detectPRs flags a beaten prior best and first-ever lifts', () => {
  const prev = { Bench: { weight: 100, reps: 5, e1rm: estimated1RM(100, 5) } };
  const logged = [
    { name: 'Bench', sets: [set(140, 5)] }, // beats prior → PR
    { name: 'Row', sets: [set(80, 8)] },    // first ever → PR
  ];
  const { count, names } = detectPRs(prev as any, logged as any);
  assert.equal(count, 2);
  assert.deepEqual(names.sort(), ['Bench', 'Row']);
});

test('detectPRs does not flag a set that fails to beat the prior best', () => {
  const prev = { Bench: { weight: 140, reps: 5, e1rm: estimated1RM(140, 5) } };
  const logged = [{ name: 'Bench', sets: [set(100, 5)] }];
  assert.equal(detectPRs(prev as any, logged as any).count, 0);
});

test('exerciseVolumeSeries returns oldest→newest per-session volume', () => {
  const ws = [
    workout({ id: 'b', timestamp: 2000, loggedExercises: [{ name: 'Bench', sets: [set(100, 5)] }] }),
    workout({ id: 'a', timestamp: 1000, loggedExercises: [{ name: 'Bench', sets: [set(50, 10)] }] }),
  ];
  const series = exerciseVolumeSeries(ws as any, 'Bench');
  assert.deepEqual(series.map(s => s.ts), [1000, 2000]);
  assert.deepEqual(series.map(s => s.volume), [500, 500]);
});

// ─────────────────────────────────────────────────────────────
//  readiness.ts
// ─────────────────────────────────────────────────────────────
test('computeReadiness averages recovery and clamps 0..100', () => {
  assert.equal(computeReadiness([{ name: 'A', recovery: 100 }, { name: 'B', recovery: 100 }], null), 100);
  assert.equal(computeReadiness([{ name: 'A', recovery: 50 }], null), 50);
  assert.equal(computeReadiness([], null), 0);
});

test('computeReadiness applies the energy adjustment and clamps', () => {
  assert.equal(computeReadiness([{ name: 'A', recovery: 50 }], 'low'), 35);
  assert.equal(computeReadiness([{ name: 'A', recovery: 50 }], 'high'), 60);
  assert.equal(computeReadiness([{ name: 'A', recovery: 95 }], 'high'), 100); // clamped
});

test('computeReadiness blends a device sleep score when present', () => {
  // base 100 * 0.7 + 40 * 0.3 = 82
  assert.equal(computeReadiness([{ name: 'A', recovery: 100 }], null, { sleepScore: 40 }), 82);
});

test('readiness label + color thresholds', () => {
  assert.equal(readinessLabel(80), 'Primed to train');
  assert.equal(readinessLabel(20), 'Prioritize recovery');
  assert.equal(readinessColor(80), '#10b981');
  assert.equal(readinessColor(10), '#ef4444');
});

// ─────────────────────────────────────────────────────────────
//  recovery.ts
// ─────────────────────────────────────────────────────────────
test('computeMuscleRecovery returns fully-recovered groups with no history', () => {
  const rec = computeMuscleRecovery([]);
  assert.ok(rec.length > 0);
  assert.ok(rec.every(m => m.recovery === 100));
});

test('computeMuscleRecovery drops recovery right after training a muscle', () => {
  const ws = [workout({
    timestamp: Date.now(), // just now
    loggedExercises: [{ name: 'Barbell Bench Press', muscles: ['Chest'], sets: [set(100, 5)] }],
  })];
  const rec = computeMuscleRecovery(ws as any);
  const chest = rec.find(m => m.name.toLowerCase().includes('chest'));
  assert.ok(chest, 'expected a chest group');
  assert.ok(chest!.recovery < 100, 'chest should be fatigued right after training');
});

// ─────────────────────────────────────────────────────────────
//  stats.ts
// ─────────────────────────────────────────────────────────────
test('deriveDashboardStats is all-zero with no workouts', () => {
  const s = deriveDashboardStats([]);
  assert.equal(s.streak, 0);
  assert.equal(s.daysThisWeek, 0);
});

test('todayKey is a stable YYYY-MM-DD string', () => {
  assert.match(todayKey(), /^\d{4}-\d{2}-\d{2}$/);
});
