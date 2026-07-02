import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from '@/tw';
import { KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { X, Search, Plus, Dumbbell, ChevronLeft, Trash2, GripVertical, ChevronDown, Clock, Link2 } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, LinearTransition, Easing,
  useSharedValue, useAnimatedStyle, withTiming, runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppStore, RoutineExercise, RoutineExerciseSet } from '@/store/useAppStore';
import { ExerciseCatalogItem, loadExerciseCatalog } from '@/lib/exerciseCatalog';

// ── Bodyweight detection ──
const BODYWEIGHT_RE = /pull[-\s]?up|chin[-\s]?up|push[-\s]?up|\bdip\b|plank|sit[-\s]?up|crunch|muscle[-\s]?up|pistol|burpee|leg\s?raise|mountain\s?climber|hanging|bodyweight/i;

function detectBodyweight(item: ExerciseCatalogItem): boolean {
  const eq = item.equipment.map(e => e.toLowerCase());
  const hasGear = eq.some(e => /barbell|dumbbell|kettlebell|machine|cable|band|plate|bench|weight/.test(e));
  if (!hasGear && (eq.length === 0 || eq.some(e => /body|none/.test(e)))) return true;
  return BODYWEIGHT_RE.test(item.name);
}

function isBodyweightExercise(ex: RoutineExercise): boolean {
  return ex.isBodyweight ?? BODYWEIGHT_RE.test(ex.name);
}

const REST_PRESETS = [0, 30, 60, 90, 120, 180];
function fmtRest(s?: number): string {
  if (!s) return 'Off';
  const m = Math.floor(s / 60), ss = s % 60;
  return m ? `${m}:${String(ss).padStart(2, '0')}` : `${s}s`;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// ── Draggable exercise card (module-scope so reorder animates, not remounts) ──
type ExerciseCardProps = {
  exercise: RoutineExercise;
  index: number;
  count: number;
  activeIndex: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  activeHeight: SharedValue<number>;
  tops: SharedValue<number[]>;
  heights: SharedValue<number[]>;
  onLayout: (i: number, y: number, h: number) => void;
  commitReorder: (from: number, to: number) => void;
  onRemove: (i: number) => void;
  onUpdateSet: (exIdx: number, sIdx: number, update: Partial<RoutineExerciseSet>) => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, sIdx: number) => void;
  onSetRest: (exIdx: number, seconds: number) => void;
  onToggleRepRange: (exIdx: number) => void;
  onToggleSuperset: (exIdx: number) => void;
  inSuperset: boolean;
  supersetStart: boolean;
  groupWithPrev: boolean;
  expanded: boolean;
  onToggle: (id: number) => void;
};

function ExerciseCard({
  exercise, index, count,
  activeIndex, hoverIndex, dragY, activeHeight, tops, heights,
  onLayout, commitReorder, onRemove, onUpdateSet, onAddSet, onRemoveSet,
  onSetRest, onToggleRepRange, onToggleSuperset,
  inSuperset, supersetStart, groupWithPrev,
  expanded, onToggle,
}: ExerciseCardProps) {
  const bw = isBodyweightExercise(exercise);

  // Collapsed summary, e.g. "4 sets · 135 lb × 5" or "3 sets · BW × 8"
  const summary = useMemo(() => {
    const n = exercise.sets.length;
    const s = exercise.sets[0] ?? { weight: 0, reps: 0 };
    const w = bw ? (s.weight ? `BW+${s.weight}` : 'BW') : `${s.weight || 0} lb`;
    const reps = exercise.repRange && s.repsMax ? `${s.reps || 0}–${s.repsMax}` : `${s.reps || 0}`;
    return `${n} ${n === 1 ? 'set' : 'sets'} · ${w} × ${reps}`;
  }, [exercise.sets, bw, exercise.repRange]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(expanded ? '0deg' : '-90deg', { duration: 200 }) }],
  }));

  // Height-animated accordion: content stays mounted, wrapper slides 0 ↔ measured.
  const contentHeight = useSharedValue(0);
  const bodyStyle = useAnimatedStyle(() => ({
    height: withTiming(expanded ? contentHeight.value : 0, { duration: 220, easing: Easing.inOut(Easing.quad) }),
    opacity: withTiming(expanded ? 1 : 0, { duration: expanded ? 240 : 130 }),
  }));

  const pan = useMemo(() => Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      activeIndex.value = index;
      activeHeight.value = heights.value[index] ?? 0;
      hoverIndex.value = index;
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      const top = tops.value[index] ?? 0;
      const centerY = top + (heights.value[index] ?? 0) / 2 + e.translationY;
      let idx = 0;
      for (let k = 0; k < tops.value.length; k++) {
        const mid = (tops.value[k] ?? 0) + (heights.value[k] ?? 0) / 2;
        if (centerY >= mid) idx = k;
      }
      hoverIndex.value = idx;
    })
    .onEnd(() => {
      runOnJS(commitReorder)(activeIndex.value, hoverIndex.value);
    })
    .onFinalize(() => {
      activeIndex.value = -1;
      hoverIndex.value = -1;
      dragY.value = 0;
    }),
  [index, count]);

  const animStyle = useAnimatedStyle(() => {
    const a = activeIndex.value;
    if (a === index) {
      return { transform: [{ translateY: dragY.value }, { scale: 1.015 }], zIndex: 50, opacity: 0.98 } as any;
    }
    let shift = 0;
    const h = hoverIndex.value;
    if (a !== -1) {
      const gap = (activeHeight.value || 0) + 10;
      if (index > a && index <= h) shift = -gap;
      else if (index < a && index >= h) shift = gap;
    }
    return { transform: [{ translateY: withTiming(shift, { duration: 180, easing: Easing.out(Easing.quad) }) }], zIndex: 0 } as any;
  });

  return (
    <Animated.View
      layout={LinearTransition.duration(200).easing(Easing.inOut(Easing.quad))}
      onLayout={e => onLayout(index, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
      style={[{
        backgroundColor: '#1c1c21',
        borderWidth: 1,
        borderColor: inSuperset ? '#3b3766' : '#313138',
        borderLeftWidth: inSuperset ? 3 : 1,
        borderLeftColor: inSuperset ? '#6366f1' : '#313138',
        borderRadius: 12,
        marginBottom: 12,
        marginTop: groupWithPrev ? -4 : 0,
      }, animStyle]}
      className="overflow-hidden"
    >
      {/* Header — grip drags, body toggles */}
      <View className="flex-row items-center pl-2.5 pr-2.5 py-3">
        <GestureDetector gesture={pan}>
          <View className="w-9 h-11 items-center justify-center active:opacity-50">
            <GripVertical size={18} color="#52525b" />
          </View>
        </GestureDetector>

        <Pressable onPress={() => onToggle(exercise.id)} className="flex-1 flex-row items-center active:opacity-70 py-1">
          <View className="flex-1 mr-3">
            <Text className="text-white font-semibold text-[16px]" numberOfLines={1}>
              {exercise.name}
            </Text>
            {!expanded && (
              <Text className="text-neutral-500 text-[13px] mt-1" numberOfLines={1}>{summary}</Text>
            )}
          </View>
          {supersetStart && (
            <View className="px-2 py-1 rounded-md bg-indigo-500/12 mr-2">
              <Text className="text-indigo-300 font-semibold text-[10px]">SUPERSET</Text>
            </View>
          )}
          {bw && (
            <View className="px-2 py-1 rounded-md bg-emerald-500/12 mr-2.5">
              <Text className="text-emerald-400 font-semibold text-[11px]">BW</Text>
            </View>
          )}
          <Animated.View style={chevronStyle}>
            <ChevronDown size={20} color="#52525b" />
          </Animated.View>
        </Pressable>

        <Pressable onPress={() => onRemove(index)} hitSlop={8} className="w-10 h-10 items-center justify-center active:opacity-50 ml-1">
          <X size={18} color="#52525b" />
        </Pressable>
      </View>

      {/* Sets (height-animated) */}
      <Animated.View style={bodyStyle} className="overflow-hidden">
        <View
          onLayout={e => { contentHeight.value = e.nativeEvent.layout.height; }}
          className="px-4 pb-3 pt-0.5"
        >
          {/* Column labels */}
          <View className="flex-row items-center pb-1.5 gap-2.5">
            <Text className="w-8 text-[11px] text-neutral-600 text-center">Set</Text>
            <Text className="flex-1 min-w-0 text-[11px] text-neutral-600 text-center">{bw ? '+lb' : 'lb'}</Text>
            <Text className="flex-1 min-w-0 text-[11px] text-neutral-600 text-center">Reps</Text>
            <View className="w-8" />
          </View>

          {exercise.sets.map((set, sIdx) => (
            <View key={sIdx} className="flex-row items-center mb-1.5 gap-2.5">
              <Text className="w-8 text-neutral-500 font-semibold text-[14px] text-center">{sIdx + 1}</Text>

              <TextInput
                style={{ minWidth: 0 }}
                className="flex-1 min-w-0 bg-neutral-800/50 rounded-lg py-2 text-white font-semibold text-center text-[15px]"
                value={set.weight === 0 ? '' : String(set.weight)}
                onChangeText={val => onUpdateSet(index, sIdx, { weight: parseFloat(val) || 0 })}
                keyboardType="numeric"
                placeholder={bw ? 'BW' : '0'}
                placeholderTextColor={bw ? '#34d399' : '#3f3f46'}
              />

              {exercise.repRange ? (
                <View className="flex-1 min-w-0 flex-row items-center">
                  <TextInput
                    style={{ minWidth: 0 }}
                    className="flex-1 min-w-0 bg-neutral-800/50 rounded-lg py-2 text-white font-semibold text-center text-[15px]"
                    value={set.reps === 0 ? '' : String(set.reps)}
                    onChangeText={val => onUpdateSet(index, sIdx, { reps: parseInt(val) || 0 })}
                    keyboardType="numeric"
                    placeholder="8"
                    placeholderTextColor="#3f3f46"
                  />
                  <Text className="text-neutral-600 text-[13px] px-1">–</Text>
                  <TextInput
                    style={{ minWidth: 0 }}
                    className="flex-1 min-w-0 bg-neutral-800/50 rounded-lg py-2 text-white font-semibold text-center text-[15px]"
                    value={set.repsMax ? String(set.repsMax) : ''}
                    onChangeText={val => onUpdateSet(index, sIdx, { repsMax: parseInt(val) || undefined })}
                    keyboardType="numeric"
                    placeholder="12"
                    placeholderTextColor="#3f3f46"
                  />
                </View>
              ) : (
                <TextInput
                  style={{ minWidth: 0 }}
                  className="flex-1 min-w-0 bg-neutral-800/50 rounded-lg py-2 text-white font-semibold text-center text-[15px]"
                  value={set.reps === 0 ? '' : String(set.reps)}
                  onChangeText={val => onUpdateSet(index, sIdx, { reps: parseInt(val) || 0 })}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#3f3f46"
                />
              )}

              {exercise.sets.length > 1 ? (
                <Pressable onPress={() => onRemoveSet(index, sIdx)} hitSlop={8} className="w-8 h-8 items-center justify-center active:opacity-50">
                  <Trash2 size={15} color="#52525b" />
                </Pressable>
              ) : (
                <View className="w-8" />
              )}
            </View>
          ))}

          <Pressable
            onPress={() => onAddSet(index)}
            className="mt-1.5 py-2 rounded-lg flex-row items-center justify-center active:bg-neutral-800/40"
          >
            <Plus size={15} color="#818cf8" />
            <Text className="text-indigo-400 font-medium text-[14px] ml-1.5">Add set</Text>
          </Pressable>

          {/* Rest timer */}
          <View className="mt-3 pt-3 border-t border-neutral-800/50">
            <View className="flex-row items-center mb-2">
              <Clock size={13} color="#71717a" />
              <Text className="text-neutral-400 text-[12px] font-medium ml-1.5">Rest between sets</Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {REST_PRESETS.map(p => {
                const active = (exercise.restSeconds ?? 0) === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => onSetRest(index, p)}
                    style={{ backgroundColor: active ? '#4f46e5' : '#26262c' }}
                    className="px-2.5 py-1.5 rounded-lg active:opacity-70"
                  >
                    <Text style={{ color: active ? '#ffffff' : '#a1a1aa' }} className="font-semibold text-[12px]">{fmtRest(p)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Rep range + superset */}
          <View className="flex-row gap-2 mt-3">
            <Pressable
              onPress={() => onToggleRepRange(index)}
              style={{ backgroundColor: exercise.repRange ? '#4f46e5' : '#26262c' }}
              className="px-3 py-2 rounded-lg active:opacity-70"
            >
              <Text style={{ color: exercise.repRange ? '#ffffff' : '#a1a1aa' }} className="font-semibold text-[12px]">Rep range</Text>
            </Pressable>
            {(index > 0 || inSuperset) && (
              <Pressable
                onPress={() => onToggleSuperset(index)}
                style={{ backgroundColor: inSuperset ? '#4f46e5' : '#26262c' }}
                className="flex-row items-center px-3 py-2 rounded-lg active:opacity-70"
              >
                <Link2 size={13} color={inSuperset ? '#ffffff' : '#a1a1aa'} />
                <Text style={{ color: inSuperset ? '#ffffff' : '#a1a1aa' }} className="font-semibold text-[12px] ml-1.5">{inSuperset ? 'Leave superset' : 'Superset'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function RoutineEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const isCreate = id === 'new';
  const { routines, addRoutine, updateRoutine, deleteRoutine } = useAppStore();

  const [name, setName] = useState('');
  const [fallbackMuscles, setFallbackMuscles] = useState<string[]>([]);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Safe back: reloading straight onto this route (esp. web) leaves no history,
  // so router.back() throws GO_BACK. Fall back to the routines home.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/workout');
  };

  const toggleExpanded = (exId: number) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(exId) ? next.delete(exId) : next.add(exId);
    return next;
  });

  // ── Drag-reorder shared state ──
  const activeIndex = useSharedValue(-1);
  const hoverIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const activeHeight = useSharedValue(0);
  const tops = useSharedValue<number[]>([]);
  const heights = useSharedValue<number[]>([]);
  const topsRef = useRef<number[]>([]);
  const heightsRef = useRef<number[]>([]);

  const setCardLayout = (i: number, y: number, h: number) => {
    topsRef.current[i] = y;
    heightsRef.current[i] = h;
    tops.value = topsRef.current.slice();
    heights.value = heightsRef.current.slice();
  };

  const commitReorder = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to) return;
    setExercises(prev => (from < prev.length && to < prev.length ? arrayMove(prev, from, to) : prev));
  };

  useEffect(() => {
    if (!isCreate) {
      const existing = routines.find(r => r.id === id);
      if (existing) {
        setName(existing.name);
        setFallbackMuscles(existing.muscles.filter(m => m && m !== 'Full Body'));
        setExercises(existing.exercises);
      } else {
        Alert.alert('Error', 'Routine not found');
        goBack();
      }
    }
  }, [id, isCreate]);

  useEffect(() => {
    if (catalogVisible && catalog.length === 0) {
      setCatalogLoading(true);
      loadExerciseCatalog()
        .then(setCatalog)
        .catch(() => Alert.alert('Error', 'Failed to load exercises'))
        .finally(() => setCatalogLoading(false));
    }
  }, [catalogVisible]);

  const totalSets = useMemo(() => exercises.reduce((sum, ex) => sum + ex.sets.length, 0), [exercises]);
  const estMinutes = useMemo(() => Math.max(5, Math.round(totalSets * 3.5)), [totalSets]);

  // Focus auto-derived from the muscles each exercise trains (most common first).
  const derivedFocus = useMemo(() => {
    const counts = new Map<string, number>();
    exercises.forEach(ex => (ex.muscles ?? []).forEach(m => counts.set(m, (counts.get(m) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  }, [exercises]);

  const focus = derivedFocus.length ? derivedFocus : fallbackMuscles;

  const metaLine = useMemo(() => {
    if (exercises.length === 0) return 'No exercises yet';
    const parts = [
      `${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'}`,
      `${totalSets} sets`,
      `~${estMinutes} min`,
    ];
    if (focus.length) parts.push(focus.slice(0, 2).join(', '));
    return parts.join('  ·  ');
  }, [exercises.length, totalSets, estMinutes, focus]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) { Alert.alert('Name your routine', 'Give it a name before saving.'); return; }
    if (exercises.length === 0) { Alert.alert('Add an exercise', 'A routine needs at least one exercise.'); return; }

    const payload = {
      name: trimmedName,
      duration: `~${estMinutes} min`,
      muscles: focus.length ? focus.slice(0, 4) : ['Full Body'],
      exercises: exercises.map((ex, idx) => ({
        id: ex.id || Date.now() + idx,
        name: ex.name,
        isBarbell: ex.isBarbell,
        isBodyweight: ex.isBodyweight,
        muscles: ex.muscles,
        restSeconds: ex.restSeconds,
        repRange: ex.repRange,
        supersetGroup: ex.supersetGroup,
        sets: ex.sets.map(s => ({
          weight: Math.max(0, Number(s.weight) || 0),
          reps: Math.max(1, Number(s.reps) || 10),
          repsMax: ex.repRange && s.repsMax ? Math.max(Number(s.reps) || 1, s.repsMax) : undefined,
        })),
      })),
    };

    isCreate ? addRoutine(payload) : updateRoutine(id as string, payload);
    goBack();
  };

  const handleDelete = () => {
    Alert.alert('Delete routine', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteRoutine(id as string); goBack(); } },
    ]);
  };

  const removeExercise = (i: number) => setExercises(prev => prev.filter((_, idx) => idx !== i));

  const updateSet = (exIdx: number, sIdx: number, update: Partial<RoutineExerciseSet>) => {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, si) => si === sIdx ? { ...s, ...update } : s),
    }));
  };

  const addSetToExercise = (exIdx: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { reps: last?.reps ?? 10, weight: last?.weight ?? 0 }] };
    }));
  };

  const removeSetFromExercise = (exIdx: number, sIdx: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex;
      return { ...ex, sets: ex.sets.filter((_, si) => si !== sIdx) };
    }));
  };

  const setRest = (exIdx: number, seconds: number) =>
    setExercises(prev => prev.map((ex, i) => i === exIdx ? { ...ex, restSeconds: seconds } : ex));

  const toggleRepRange = (exIdx: number) =>
    setExercises(prev => prev.map((ex, i) => i === exIdx ? { ...ex, repRange: !ex.repRange } : ex));

  // Group an exercise with the one above it, or leave its current group.
  const toggleSuperset = (exIdx: number) => setExercises(prev => {
    const list = prev.map(e => ({ ...e }));
    const cur = list[exIdx];
    if (cur.supersetGroup != null) {
      const g = cur.supersetGroup;
      cur.supersetGroup = undefined;
      const members = list.filter(e => e.supersetGroup === g);
      if (members.length === 1) members[0].supersetGroup = undefined; // don't leave a lone group
      return list;
    }
    if (exIdx === 0) return list;
    const prevEx = list[exIdx - 1];
    const g = prevEx.supersetGroup ?? (Math.max(0, ...list.map(e => e.supersetGroup ?? 0)) + 1);
    prevEx.supersetGroup = g;
    cur.supersetGroup = g;
    return list;
  });

  const addExerciseFromCatalog = (item: ExerciseCatalogItem) => {
    const bodyweight = detectBodyweight(item);
    const newId = Date.now();
    setExercises(prev => [...prev, {
      id: newId,
      name: item.name,
      isBarbell: !bodyweight && (item.equipment.some(e => e.toLowerCase().includes('barbell')) || /squat|bench|deadlift/i.test(item.name)),
      isBodyweight: bodyweight,
      muscles: item.muscles.slice(0, 3),
      sets: [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }],
    }]);
    setExpandedIds(prev => new Set(prev).add(newId));
    setCatalogVisible(false);
    setSearchQuery('');
  };

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return catalog.slice(0, 50);
    return catalog.filter(ex =>
      ex.name.toLowerCase().includes(q) || ex.muscles.some(m => m.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [catalog, searchQuery]);

  const isSaveDisabled = !name.trim() || exercises.length === 0;
  const allExpanded = exercises.length > 0 && exercises.every(e => expandedIds.has(e.id));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#09090b' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20 }} className="pb-4 flex-row items-center justify-between">
        <Pressable onPress={goBack} className="flex-row items-center active:opacity-60 py-1 -ml-1">
          <ChevronLeft size={22} color="#a1a1aa" />
          <Text className="text-neutral-400 font-medium text-[15px]">Back</Text>
        </Pressable>

        <Text className="text-white font-semibold text-[15px]">
          {isCreate ? 'New routine' : 'Edit routine'}
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={isSaveDisabled}
          className={`px-5 py-2 rounded-full ${isSaveDisabled ? 'bg-neutral-800' : 'bg-indigo-500 active:opacity-80'}`}
        >
          <Text className={`font-semibold text-[14px] ${isSaveDisabled ? 'text-neutral-600' : 'text-white'}`}>Save</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* ── Title + derived meta ── */}
        <Animated.View entering={FadeInDown.duration(300)} style={{ paddingHorizontal: 20 }} className="pt-6 pb-1">
          <TextInput
            className="text-white text-[26px] font-bold pb-1"
            value={name}
            onChangeText={setName}
            placeholder="Routine name"
            placeholderTextColor="#3f3f46"
          />
          <Text className="text-neutral-500 text-[13px] mt-1.5">{metaLine}</Text>
        </Animated.View>

        <View style={{ paddingHorizontal: 20 }}><View className="h-px bg-neutral-900 my-6" /></View>

        {/* ── Exercises ── */}
        <Animated.View entering={FadeInDown.delay(70).duration(300)} style={{ paddingHorizontal: 20 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[17px] font-bold text-white">Exercises</Text>
            {exercises.length > 1 && (
              <Pressable
                onPress={() => setExpandedIds(allExpanded ? new Set() : new Set(exercises.map(e => e.id)))}
                className="active:opacity-60 py-1"
              >
                <Text className="text-indigo-400 font-medium text-[13px]">{allExpanded ? 'Collapse all' : 'Expand all'}</Text>
              </Pressable>
            )}
          </View>

          {exercises.length === 0 && (
            <View className="items-center py-10">
              <Dumbbell size={26} color="#3f3f46" />
              <Text className="text-neutral-500 text-[14px] mt-3">No exercises yet</Text>
              <Text className="text-neutral-700 text-[12px] mt-1">Add one to get started</Text>
            </View>
          )}

          {/* Draggable exercise cards */}
          {exercises.map((exercise, exIdx) => {
            const g = exercise.supersetGroup;
            const prevG = exIdx > 0 ? exercises[exIdx - 1].supersetGroup : undefined;
            const inSuperset = g != null;
            const groupWithPrev = g != null && g === prevG;
            const supersetStart = g != null && g !== prevG;
            return (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={exIdx}
                count={exercises.length}
                activeIndex={activeIndex}
                hoverIndex={hoverIndex}
                dragY={dragY}
                activeHeight={activeHeight}
                tops={tops}
                heights={heights}
                onLayout={setCardLayout}
                commitReorder={commitReorder}
                onRemove={removeExercise}
                onUpdateSet={updateSet}
                onAddSet={addSetToExercise}
                onRemoveSet={removeSetFromExercise}
                onSetRest={setRest}
                onToggleRepRange={toggleRepRange}
                onToggleSuperset={toggleSuperset}
                inSuperset={inSuperset}
                supersetStart={supersetStart}
                groupWithPrev={groupWithPrev}
                expanded={expandedIds.has(exercise.id)}
                onToggle={toggleExpanded}
              />
            );
          })}

          {/* Delete — demoted text link */}
          {!isCreate && (
            <Pressable onPress={handleDelete} className="items-center py-4 mt-2 active:opacity-60">
              <Text className="text-red-500/70 font-medium text-[13px]">Delete routine</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── Pinned primary action ── */}
      <View style={{ paddingHorizontal: 20 }} className="pt-3 pb-9 border-t border-neutral-900">
        <Pressable
          onPress={() => setCatalogVisible(true)}
          className="py-4 rounded-2xl bg-indigo-500 flex-row items-center justify-center active:opacity-85"
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-semibold text-[15px] ml-2">Add exercise</Text>
        </Pressable>
      </View>

      {/* ── Exercise Catalog Modal ── */}
      <Modal visible={catalogVisible} animationType="slide" transparent>
        <View className="flex-1 bg-neutral-950 mt-16 rounded-t-3xl overflow-hidden">
          <View className="w-10 h-1 bg-neutral-800 rounded-full self-center mt-3 mb-1" />

          <View style={{ paddingHorizontal: 20 }} className="pb-4 pt-2 flex-row items-center justify-between">
            <Text className="text-white font-bold text-[20px]">Add exercise</Text>
            <Pressable onPress={() => setCatalogVisible(false)} className="w-9 h-9 rounded-full bg-neutral-900 items-center justify-center active:opacity-60">
              <X size={17} color="#a1a1aa" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20 }} className="pb-3">
            <View className="flex-row items-center bg-neutral-900 rounded-xl px-4">
              <Search size={16} color="#525252" />
              <TextInput
                className="flex-1 py-3 text-white text-[15px] ml-3"
                placeholder="Search exercises…"
                placeholderTextColor="#52525b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {catalogLoading ? (
              <View className="py-20 items-center">
                <ActivityIndicator size="large" color="#6366f1" />
                <Text className="text-neutral-600 mt-4">Loading exercises…</Text>
              </View>
            ) : (
              <View className="py-2 gap-1">
                {filteredCatalog.length === 0 ? (
                  <Text className="text-neutral-600 text-center py-10">No exercises found</Text>
                ) : (
                  filteredCatalog.map(item => (
                    <Pressable
                      key={item.id}
                      onPress={() => addExerciseFromCatalog(item)}
                      className="rounded-xl px-3 py-3.5 flex-row items-center justify-between active:bg-neutral-900"
                    >
                      <View className="flex-1 pr-4">
                        <Text className="text-white font-semibold text-[15px] mb-0.5">{item.name}</Text>
                        <Text className="text-neutral-500 text-[12px]">
                          {item.muscles.slice(0, 2).join(' · ') || 'Full body'} · {item.equipment[0] || 'Bodyweight'}
                        </Text>
                      </View>
                      <Plus size={18} color="#818cf8" />
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
