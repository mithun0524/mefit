import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from '@/tw';
import { Plus, CheckCircle2, Search, Trash2, Timer, Play, MoreHorizontal, Sparkles, Dumbbell, BarChart2, ChevronRight, Clock, Zap, X, ChevronDown } from 'lucide-react-native';

import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, LinearTransition } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { ExerciseCatalogItem, loadExerciseCatalog } from '@/lib/exerciseCatalog';
import { exerciseBests, detectPRs } from '@/lib/history';

// Match the editor's bodyweight detection so old routines (no stored flag) still show BW.
const BODYWEIGHT_RE = /pull[-\s]?up|chin[-\s]?up|push[-\s]?up|\bdip\b|plank|sit[-\s]?up|crunch|muscle[-\s]?up|pistol|burpee|leg\s?raise|mountain\s?climber|hanging|bodyweight/i;

// ─────────────────────────────────────────────────────────────
//  ANIMATED CHECKMARK  (Hevy-style circular tap-to-complete)
// ─────────────────────────────────────────────────────────────
function AnimatedCheckmark({ completed, onPress }: { completed: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.82, { duration: 80 }), withSpring(1, { damping: 6, stiffness: 280 }));
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            backgroundColor: completed ? '#10b981' : 'transparent',
            borderColor: completed ? '#10b981' : '#3f3f3f',
          },
        ]}
      >
        {completed && <CheckCircle2 size={17} color="white" strokeWidth={2.5} />}
      </Animated.View>
    </Pressable>
  );
}


// ─────────────────────────────────────────────────────────────
//  STAT CHIP
// ─────────────────────────────────────────────────────────────
function StatChip({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <View className={`flex-1 rounded-2xl px-4 py-3 border ${accent ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-neutral-900 border-neutral-800'}`}>
      <Text className={`text-[9px] font-black uppercase tracking-[0.28em] mb-1 ${accent ? 'text-indigo-400' : 'text-neutral-500'}`}>{label}</Text>
      <Text className={`text-2xl font-black tracking-tight ${accent ? 'text-indigo-300' : 'text-white'}`}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function WorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { routines, workouts, addWorkout, setLastCompletedWorkout, deleteRoutine, duplicateRoutine } = useAppStore();

  const [activeRoutine, setActiveRoutine] = useState<any | null>(null);
  const [activeExercises, setActiveExercises] = useState<any[]>([]);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [menuOpenRoutineId, setMenuOpenRoutineId] = useState<string | null>(null);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [exerciseCatalog, setExerciseCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);

  // Load exercise catalog once
  useEffect(() => {
    let active = true;
    setExerciseLoading(true);
    loadExerciseCatalog()
      .then(items => { if (active) setExerciseCatalog(items); })
      .catch(() => {})
      .finally(() => { if (active) setExerciseLoading(false); });
    return () => { active = false; };
  }, []);

  // Rest timer countdown
  useEffect(() => {
    if (restTimer === null || restTimer <= 0) {
      if (restTimer === 0) setRestTimer(null);
      return;
    }
    const id = setInterval(() => setRestTimer(p => (p ? p - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [restTimer]);

  // Live elapsed time ticker
  useEffect(() => {
    if (!workoutStartTime) return;
    const id = setInterval(() => setElapsedTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [workoutStartTime]);

  // ── Stats ──────────────────────────────────────────────────
  const routineStats = useMemo(() => ({
    totalRoutines: routines.length,
    totalExercises: routines.reduce((s, r) => s + r.exercises.length, 0),
    totalSets: routines.reduce((s, r) => s + r.exercises.reduce((ss, e) => ss + e.sets.length, 0), 0),
  }), [routines]);

  const workoutStats = useMemo(() => {
    const total = activeExercises.reduce((s, e) => s + e.sets.length, 0);
    const done = activeExercises.reduce((s, e) => s + e.sets.filter((x: any) => x.completed).length, 0);
    const vol = activeExercises.reduce((s, e) => s + e.sets.reduce((ss: number, x: any) =>
      x.completed ? ss + (Number(x.weight) || 0) * (Number(x.reps) || 0) : ss, 0), 0);
    const mins = workoutStartTime ? Math.max(0, Math.floor((Date.now() - workoutStartTime) / 60000)) : 0;
    return { total, done, vol, mins, pct: total > 0 ? done / total : 0 };
  }, [activeExercises, workoutStartTime, elapsedTick]);

  // ── Actions ────────────────────────────────────────────────
  const startRoutine = useCallback((routine: any) => {
    const exercises = (routine.exercises || []).map((ex: any, idx: number) => ({
      id: idx + 1,
      name: ex.name,
      isBarbell: ex.isBarbell,
      isBodyweight: ex.isBodyweight ?? BODYWEIGHT_RE.test(ex.name),
      restSeconds: ex.restSeconds,
      repRange: ex.repRange,
      supersetGroup: ex.supersetGroup,
      muscles: ex.muscles,
      sets: (ex.sets?.length ? ex.sets : [{ reps: 10, weight: 0 }]).map((s: any) => ({
        reps: s.reps ?? 10,
        repsMax: s.repsMax,
        weight: s.weight ?? 0,
        completed: false,
      })),
    }));
    setActiveExercises(exercises);
    setActiveRoutine(routine);
    setRestTimer(null);
    setWorkoutStartTime(Date.now());
    setMenuOpenRoutineId(null);
  }, []);

  const endWorkout = useCallback(() => {
    setActiveRoutine(null);
    setActiveExercises([]);
    setRestTimer(null);
    setWorkoutStartTime(null);
  }, []);

  const saveWorkout = useCallback(() => {
    const durationMins = workoutStartTime
      ? Math.max(1, Math.floor((Date.now() - workoutStartTime) / 60000))
      : 1;

    let totalVol = 0;
    let setsCompleted = 0;
    let totalSets = 0;

    // Structured per-exercise log — carries muscles + sets for real PRs & recovery.
    const loggedExercises = activeExercises.map(ex => {
      const sets = ex.sets.map((s: any) => ({
        weight: Number(s.weight) || 0,
        reps: Number(s.reps) || 0,
        completed: Boolean(s.completed),
      }));
      totalSets += sets.length;
      sets.forEach(s => { if (s.completed) { setsCompleted++; totalVol += s.weight * s.reps; } });
      return { name: ex.name, muscles: ex.muscles, sets };
    });

    // Real PRs: sets that beat this exercise's prior all-time best (estimated 1RM).
    const prs = detectPRs(exerciseBests(workouts), loggedExercises).count;

    const names = activeExercises.map(e => e.name);

    // Save to workout history (structured + summary string)
    addWorkout({
      name: activeRoutine?.name || 'Custom Workout',
      date: 'Just now',
      duration: `${durationMins} min`,
      volumeLbs: totalVol,
      prs,
      exercises: names.join(', '),
      loggedExercises,
    });

    // Store summary for summary screen
    setLastCompletedWorkout({
      name: activeRoutine?.name || 'Custom Workout',
      durationMins,
      volumeLbs: totalVol,
      setsCompleted,
      totalSets,
      prs,
      exercises: loggedExercises,
    });

    endWorkout();
    router.push('/workout-summary' as any);
  }, [activeExercises, workoutStartTime, activeRoutine, workouts, addWorkout, setLastCompletedWorkout, endWorkout, router]);

  const toggleSetComplete = useCallback((eIdx: number, sIdx: number) => {
    setActiveExercises(prev => {
      const next = prev.map((e, i) => i !== eIdx ? e : {
        ...e,
        sets: e.sets.map((s: any, j: number) => j !== sIdx ? s : { ...s, completed: !s.completed }),
      });
      const wasCompleted = prev[eIdx].sets[sIdx].completed;
      if (!wasCompleted) {
        // In a superset, don't rest between A→B — only after the group's last exercise.
        const ex = prev[eIdx];
        const grp = ex.supersetGroup;
        const isLastInGroup = grp == null || !prev.slice(eIdx + 1).some(e => e.supersetGroup === grp);
        if (isLastInGroup) {
          const rest = ex.restSeconds ?? 90; // undefined (old routines) → 90; 0 → off
          if (rest > 0) setRestTimer(rest);
        }
      }
      return next;
    });
  }, []);

  const addSet = useCallback((eIdx: number) => {
    setActiveExercises(prev => prev.map((e, i) => {
      if (i !== eIdx) return e;
      const last = e.sets[e.sets.length - 1];
      return { ...e, sets: [...e.sets, { reps: last?.reps ?? 10, weight: last?.weight ?? 0, completed: false }] };
    }));
  }, []);

  const removeExercise = useCallback((eIdx: number) => {
    setActiveExercises(prev => prev.filter((_, i) => i !== eIdx));
  }, []);

  const updateSet = useCallback((eIdx: number, sIdx: number, field: 'weight' | 'reps', val: string) => {
    setActiveExercises(prev => prev.map((e, i) => i !== eIdx ? e : {
      ...e,
      sets: e.sets.map((s: any, j: number) => j !== sIdx ? s : { ...s, [field]: val }),
    }));
  }, []);

  const addSuggestedExercise = useCallback((ex: ExerciseCatalogItem) => {
    setActiveExercises(prev => [...prev, {
      id: Date.now(),
      name: ex.name,
      isBarbell: ex.equipment.some(e => e.toLowerCase().includes('barbell')) || /squat|deadlift|bench|press/i.test(ex.name),
      muscles: ex.muscles?.slice(0, 3),
      sets: [{ reps: 10, weight: 0, completed: false }, { reps: 10, weight: 0, completed: false }, { reps: 10, weight: 0, completed: false }],
    }]);
    setExerciseQuery('');
  }, []);

  const filteredExercises = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return exerciseCatalog.slice(0, 5);
    return exerciseCatalog.filter(e =>
      [e.name, e.category, ...e.muscles, ...e.equipment].join(' ').toLowerCase().includes(q)
    ).sort((a, b) => {
      const aS = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bS = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aS - bS || a.name.localeCompare(b.name);
    }).slice(0, 5);
  }, [exerciseCatalog, exerciseQuery]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ═══════════════════════════════════════════════════════════
  //  LIBRARY VIEW
  // ═══════════════════════════════════════════════════════════
  if (!activeRoutine) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b' }}>

        {/* ── Header ── */}
        <View style={{ paddingTop: insets.top + 20, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#171717', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text className="text-3xl font-bold text-white tracking-tight">Workouts</Text>
          <Pressable
            onPress={() => router.push('/routine/new')}
            style={{ width: 44, height: 44, borderRadius: 100, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}
            className="active:opacity-75"
          >
            <Plus size={22} color="white" />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 24 }}>

          {/* ── Stats Row — 3 chips side-by-side ── */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 }}>
            {[
              { label: 'Routines', value: routineStats.totalRoutines, accent: true },
              { label: 'Exercises', value: routineStats.totalExercises, accent: false },
              { label: 'Sets', value: routineStats.totalSets, accent: false },
            ].map(chip => (
              <View
                key={chip.label}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  backgroundColor: chip.accent ? 'rgba(99,102,241,0.08)' : '#171717',
                  borderWidth: 1,
                  borderColor: chip.accent ? 'rgba(99,102,241,0.25)' : '#262626',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: chip.accent ? '#818cf8' : '#71717a', marginBottom: 4 }}>
                  {chip.label}
                </Text>
                <Text style={{ fontSize: 26, fontWeight: '700', color: chip.accent ? '#a5b4fc' : '#ffffff', lineHeight: 28 }}>
                  {chip.value}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Quick Start ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <Pressable
              onPress={() => startRoutine({ name: 'Empty Workout', muscles: [], exercises: [] })}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14 }}
              className="active:opacity-70"
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Zap size={19} color="white" fill="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>Quick Start</Text>
                <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '600', marginTop: 2 }}>Log a free-form session</Text>
              </View>
              <ChevronRight size={16} color="#404040" />
            </Pressable>
          </View>

          {/* ── My Routines Header ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 17, letterSpacing: -0.3 }}>My routines</Text>
            <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500' }}>{routines.length} saved</Text>
          </View>

          {/* ── Empty state ── */}
          {routines.length === 0 && (
            <View style={{ marginHorizontal: 20, backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626', borderStyle: 'dashed', borderRadius: 20, padding: 40, alignItems: 'center' }}>
              <Dumbbell size={36} color="#2a2a2a" />
              <Text style={{ color: '#71717a', fontWeight: '700', fontSize: 15, marginTop: 14 }}>No routines yet</Text>
              <Text style={{ color: '#52525b', fontSize: 12, fontWeight: '500', marginTop: 6, textAlign: 'center' }}>Tap + to build your first routine</Text>
            </View>
          )}

          {/* ── Routine Cards ── */}
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            {routines.map((routine, idx) => (
              <Animated.View
                key={routine.id}
                entering={FadeInDown.delay(idx * 60).duration(350).springify().damping(14)}
                style={{ backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222', borderRadius: 20, overflow: 'visible' }}
              >
                {/* Left accent strip */}
                <View style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, backgroundColor: '#4f46e5', borderRadius: 4, opacity: 0.7 }} />

                <View style={{ padding: 18, paddingLeft: 22 }}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 18, letterSpacing: -0.3, lineHeight: 22 }} numberOfLines={1}>
                        {routine.name}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setMenuOpenRoutineId(id => id === routine.id ? null : routine.id)}
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' }}
                      className="active:opacity-60"
                    >
                      <MoreHorizontal size={17} color="#666" />
                    </Pressable>
                  </View>

                  {/* Dropdown */}
                  {menuOpenRoutineId === routine.id && (
                    <Animated.View
                      entering={FadeIn.duration(100)}
                      style={{ position: 'absolute', right: 18, top: 50, width: 190, backgroundColor: '#151515', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 16, zIndex: 30, overflow: 'hidden' }}
                    >
                      {[
                        { label: 'Start Workout', color: '#818cf8', fn: () => startRoutine(routine) },
                        { label: 'Edit Routine', color: '#d4d4d4', fn: () => { setMenuOpenRoutineId(null); router.push(`/routine/${routine.id}`); } },
                        { label: 'Duplicate', color: '#d4d4d4', fn: () => { setMenuOpenRoutineId(null); duplicateRoutine(routine.id); } },
                        { label: 'Delete', color: '#f87171', fn: () => { setMenuOpenRoutineId(null); Alert.alert('Delete routine?', `Remove "${routine.name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(routine.id) }]); } },
                      ].map((item, i, arr) => (
                        <Pressable
                          key={item.label}
                          onPress={item.fn}
                          style={{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#222' }}
                          className="active:opacity-60"
                        >
                          <Text style={{ color: item.color, fontWeight: '600', fontSize: 14 }}>{item.label}</Text>
                        </Pressable>
                      ))}
                    </Animated.View>
                  )}

                  {/* Meta pills */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Clock size={10} color="#6366f1" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#a3a3a3' }}>{routine.duration}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Dumbbell size={10} color="#737373" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#a3a3a3' }}>{routine.exercises.length} exercises</Text>
                    </View>
                    {routine.muscles.slice(0, 3).map((m: string) => (
                      <View key={m} style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#a5b4fc' }}>{m}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Exercise preview */}
                  {routine.exercises.length > 0 && (
                    <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: '500', lineHeight: 18, marginBottom: 14 }} numberOfLines={1}>
                      {routine.exercises.map((e: any) => e.name).join('  ·  ')}
                    </Text>
                  )}

                  {/* Start CTA */}
                  <Pressable
                    onPress={() => startRoutine(routine)}
                    style={{ backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    className="active:opacity-80"
                  >
                    <Play size={14} color="white" fill="white" />
                    <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>Start routine</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }


  // ═══════════════════════════════════════════════════════════
  //  ACTIVE WORKOUT VIEW
  // ═══════════════════════════════════════════════════════════
  const completedVol = workoutStats.vol;
  const pctDone = workoutStats.pct;

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>

      {/* ── Sticky Header ── */}
      <View style={{ paddingTop: insets.top + 20, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: '#09090b', borderBottomWidth: 1, borderBottomColor: '#141414' }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#10b981' }}>Live</Text>
            </View>
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 21, letterSpacing: -0.4 }} numberOfLines={1}>
              {activeRoutine.name}
            </Text>
          </View>
          <Pressable
            onPress={saveWorkout}
            style={{ backgroundColor: '#10b981', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 100 }}
            className="active:opacity-80"
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>Finish</Text>
          </Pressable>
        </View>

        {/* Inline stats strip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Timer size={12} color="#525252" />
            <Text style={{ color: '#a3a3a3', fontWeight: '800', fontSize: 13 }}>{workoutStats.mins}m</Text>
          </View>
          <View style={{ width: 1, height: 12, backgroundColor: '#2a2a2a' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={12} color="#525252" />
            <Text style={{ color: '#a3a3a3', fontWeight: '800', fontSize: 13 }}>
              {workoutStats.done}/{workoutStats.total} sets
            </Text>
          </View>
          {completedVol > 0 && (
            <>
              <View style={{ width: 1, height: 12, backgroundColor: '#2a2a2a' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <BarChart2 size={12} color="#525252" />
                <Text style={{ color: '#a3a3a3', fontWeight: '800', fontSize: 13 }}>
                  {completedVol >= 1000 ? `${(completedVol / 1000).toFixed(1)}k` : completedVol} lbs
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Progress bar */}
        <View style={{ height: 3, borderRadius: 4, backgroundColor: '#1f1f1f', overflow: 'hidden' }}>
          <View style={{ height: 3, borderRadius: 4, backgroundColor: '#10b981', width: `${Math.max(2, pctDone * 100)}%` }} />
        </View>
      </View>

      {/* ── Rest Timer floating pill ── */}
      {restTimer !== null && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={{ position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 50, pointerEvents: 'box-none' as any }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#3b3766', borderRadius: 100, paddingVertical: 7, paddingHorizontal: 8, gap: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.55)' } as any}>
            <Pressable onPress={() => setRestTimer(t => Math.max(5, (t ?? 0) - 15))} style={{ width: 34, height: 34, borderRadius: 100, alignItems: 'center', justifyContent: 'center' }} className="active:opacity-60">
              <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>−15</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8 }}>
              <Timer size={15} color="#818cf8" />
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 18, fontVariant: ['tabular-nums'] as any, minWidth: 46, textAlign: 'center' }}>{formatTime(restTimer)}</Text>
            </View>
            <Pressable onPress={() => setRestTimer(t => (t ?? 0) + 15)} style={{ width: 34, height: 34, borderRadius: 100, alignItems: 'center', justifyContent: 'center' }} className="active:opacity-60">
              <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>+15</Text>
            </Pressable>
            <Pressable onPress={() => setRestTimer(null)} style={{ backgroundColor: '#4f46e5', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 2 }} className="active:opacity-80">
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>Skip</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12, paddingTop: 16 }}>

        {/* ── Exercise Cards ── */}
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {activeExercises.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 44 }}>
              <Dumbbell size={28} color="#3f3f46" />
              <Text style={{ color: '#a1a1aa', fontSize: 14, marginTop: 12 }}>No exercises yet</Text>
              <Text style={{ color: '#52525b', fontSize: 12, marginTop: 4 }}>Add one below to get started</Text>
            </View>
          )}

          {activeExercises.map((exercise, eIdx) => {
            const allDone = exercise.sets.every((s: any) => s.completed);
            const g = exercise.supersetGroup;
            const prevG = eIdx > 0 ? activeExercises[eIdx - 1].supersetGroup : undefined;
            const inSuperset = g != null;
            const groupWithPrev = g != null && g === prevG;
            const isLastInGroup = g == null || !activeExercises.slice(eIdx + 1).some((e: any) => e.supersetGroup === g);
            const groupLetter = inSuperset
              ? String.fromCharCode(65 + activeExercises.slice(0, eIdx).filter((e: any) => e.supersetGroup === g).length)
              : null;
            const firstSet = exercise.sets[0] || {};
            const targetReps = exercise.repRange && firstSet.repsMax ? `Target ${firstSet.reps}–${firstSet.repsMax} reps` : null;
            // In a superset, rest only fires after the last exercise — so only label it there.
            const showRest = (!inSuperset || isLastInGroup) && exercise.restSeconds && exercise.restSeconds > 0;
            const restLabel = showRest ? `Rest ${formatTime(exercise.restSeconds)}` : null;
            const metaLine = [targetReps, restLabel].filter(Boolean).join('  ·  ');
            return (
              <Animated.View
                key={exercise.id}
                entering={FadeInDown.duration(300).springify().damping(15)}
                style={{
                  backgroundColor: allDone ? 'rgba(16,185,129,0.05)' : '#1c1c21',
                  borderWidth: 1,
                  borderColor: inSuperset ? '#3b3766' : (allDone ? 'rgba(16,185,129,0.25)' : '#313138'),
                  borderLeftWidth: inSuperset ? 3 : 1,
                  borderLeftColor: inSuperset ? '#6366f1' : (allDone ? 'rgba(16,185,129,0.25)' : '#313138'),
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginTop: groupWithPrev ? -6 : 0,
                }}
              >
                {/* Exercise Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    {inSuperset && (
                      <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#a5b4fc', fontWeight: '800', fontSize: 12 }}>{groupLetter}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16, letterSpacing: -0.2 }}>{exercise.name}</Text>
                      {metaLine.length > 0 && (
                        <Text style={{ color: '#71717a', fontSize: 11, fontWeight: '500', marginTop: 2 }}>{metaLine}</Text>
                      )}
                    </View>
                  </View>
                  {allDone ? (
                    <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 11 }}>✓ Done</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => removeExercise(eIdx)}
                      hitSlop={8}
                      style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                      className="active:opacity-50"
                    >
                      <X size={16} color="#52525b" />
                    </Pressable>
                  )}
                </View>

                {/* Sets Table */}
                <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 }}>
                  {/* Column Headers */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 }}>
                    <Text style={{ width: 32, fontSize: 11, fontWeight: '500', color: '#6b7280', textAlign: 'center' }}>Set</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '500', color: '#6b7280', textAlign: 'center' }}>{exercise.isBodyweight ? '+lb' : 'lb'}</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '500', color: '#6b7280', textAlign: 'center' }}>Reps</Text>
                    <View style={{ width: 44 }} />
                  </View>

                  {exercise.sets.map((set: any, sIdx: number) => (
                    <View
                      key={sIdx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 5,
                        marginBottom: 4,
                        borderRadius: 10,
                        paddingHorizontal: 2,
                        backgroundColor: set.completed ? 'rgba(16,185,129,0.08)' : 'transparent',
                      }}
                    >
                      {/* Set number — plain, matching the editor */}
                      <View style={{ width: 32, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: set.completed ? '#10b981' : '#71717a' }}>
                          {sIdx + 1}
                        </Text>
                      </View>

                      {/* Weight */}
                      <View style={{ flex: 1, paddingHorizontal: 4 }}>
                        <TextInput
                          style={{ minWidth: 0 }}
                          className={set.completed
                            ? 'rounded-lg py-2 text-center text-[15px] font-semibold text-emerald-500'
                            : 'bg-neutral-800/50 rounded-lg py-2 text-center text-[15px] font-semibold text-white'}
                          value={set.weight ? String(set.weight) : ''}
                          placeholder={exercise.isBodyweight ? 'BW' : '0'}
                          placeholderTextColor={exercise.isBodyweight ? '#34d399' : '#52525b'}
                          keyboardType="numeric"
                          editable={!set.completed}
                          onChangeText={val => updateSet(eIdx, sIdx, 'weight', val)}
                        />
                      </View>

                      {/* Reps */}
                      <View style={{ flex: 1, paddingHorizontal: 4 }}>
                        <TextInput
                          style={{ minWidth: 0 }}
                          className={set.completed
                            ? 'rounded-lg py-2 text-center text-[15px] font-semibold text-emerald-500'
                            : 'bg-neutral-800/50 rounded-lg py-2 text-center text-[15px] font-semibold text-white'}
                          value={set.reps != null ? String(set.reps) : ''}
                          placeholder="0"
                          placeholderTextColor="#52525b"
                          keyboardType="numeric"
                          editable={!set.completed}
                          onChangeText={val => updateSet(eIdx, sIdx, 'reps', val)}
                        />
                      </View>

                      {/* Complete toggle */}
                      <AnimatedCheckmark completed={set.completed} onPress={() => toggleSetComplete(eIdx, sIdx)} />
                    </View>
                  ))}

                  {/* Plate calc — color-coded breakdown per side */}
                  {exercise.isBarbell && (() => {
                    const activeSet = exercise.sets.find((s: any) => !s.completed);
                    const w = Number(activeSet?.weight) || 0;
                    if (!activeSet || w <= 45) return null;
                    let perSide = (w - 45) / 2;
                    const PLATES: Array<[number, string]> = [[45, '#ef4444'], [35, '#3b82f6'], [25, '#22c55e'], [10, '#eab308'], [5, '#e5e5e5'], [2.5, '#a1a1aa']];
                    const stack: Array<[number, string]> = [];
                    PLATES.forEach(([p, c]) => { while (perSide >= p) { stack.push([p, c]); perSide = +(perSide - p).toFixed(2); } });
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 2, marginBottom: 6, paddingHorizontal: 4 }}>
                        <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '500', marginRight: 3 }}>Per side</Text>
                        {stack.length ? stack.map(([p, c], i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2a2a30', borderRadius: 6, paddingLeft: 5, paddingRight: 8, paddingVertical: 3 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
                            <Text style={{ color: '#d4d4d8', fontSize: 11, fontWeight: '700' }}>{p}</Text>
                          </View>
                        )) : <Text style={{ color: '#52525b', fontSize: 11 }}>bar only</Text>}
                      </View>
                    );
                  })()}
                </View>

                {/* Add Set */}
                <Pressable
                  onPress={() => addSet(eIdx)}
                  style={{ marginHorizontal: 14, marginBottom: 10, marginTop: 4, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  className="active:opacity-60"
                >
                  <Plus size={14} color="#818cf8" />
                  <Text style={{ color: '#818cf8', fontWeight: '500', fontSize: 13 }}>Add set</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Add Exercise ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {exerciseQuery.length === 0 ? (
            <Pressable
              onPress={() => setExerciseQuery(' ')}
              style={{ backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              className="active:opacity-85"
            >
              <Plus size={18} color="white" />
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>Add exercise</Text>
            </Pressable>
          ) : (
            <View style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138', borderRadius: 16, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#313138' }}>
                <Search size={14} color="#525252" />
                <TextInput
                  style={{ flex: 1, marginLeft: 10, color: '#ffffff', fontWeight: '600', fontSize: 14 }}
                  placeholder="Search exercises..."
                  placeholderTextColor="#52525b"
                  value={exerciseQuery.trim()}
                  onChangeText={setExerciseQuery}
                  autoFocus
                />
                <Pressable onPress={() => setExerciseQuery('')}>
                  <X size={14} color="#525252" />
                </Pressable>
              </View>
              {filteredExercises.map((ex, i) => (
                <Pressable
                  key={ex.id}
                  onPress={() => addSuggestedExercise(ex)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: i < filteredExercises.length - 1 ? 1 : 0, borderBottomColor: '#313138' }}
                  className="active:opacity-60"
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{ex.name}</Text>
                    <Text style={{ color: '#71717a', fontSize: 11, fontWeight: '500', marginTop: 2 }}>{ex.muscles.slice(0, 2).join(' · ')}</Text>
                  </View>
                  <Plus size={18} color="#818cf8" />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Cancel ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
          <Pressable
            onPress={() => Alert.alert('Cancel workout?', 'Your progress will be lost.', [
              { text: 'Keep Going', style: 'cancel' },
              { text: 'Cancel', style: 'destructive', onPress: endWorkout },
            ])}
            style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}
            className="active:opacity-50"
          >
            <Text style={{ color: 'rgba(248,113,113,0.75)', fontWeight: '500', fontSize: 13 }}>Cancel workout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

