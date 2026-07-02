import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from '@/tw';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import Animated, {
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  Clock,
  Zap,
  Target,
  Trophy,
  ChevronRight,
} from 'lucide-react-native';

// ── Pulsing ring around the checkmark ──────────────────────────
function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(0.5, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 2,
          borderColor: '#10b981',
        },
      ]}
    />
  );
}

// ── Stat card ──────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  unit,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#1c1c21',
        borderWidth: 1,
        borderColor: accent ? 'rgba(251,191,36,0.3)' : '#313138',
        borderRadius: 12,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '500' }}>
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Text style={{ color: accent ? '#fbbf24' : '#ffffff', fontWeight: '700', fontSize: 24, letterSpacing: -0.5 }}>
          {value}
        </Text>
        {unit && (
          <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 12 }}>{unit}</Text>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lastCompletedWorkout, setLastCompletedWorkout } = useAppStore();

  const summary = lastCompletedWorkout;

  const handleDone = () => {
    setLastCompletedWorkout(null);
    router.replace('/(tabs)/workout' as any);
  };

  if (!summary) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#71717a', fontWeight: '500' }}>No workout data</Text>
        <Pressable onPress={handleDone} style={{ marginTop: 16 }}>
          <Text style={{ color: '#818cf8', fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const volDisplay = summary.volumeLbs >= 1000
    ? `${(summary.volumeLbs / 1000).toFixed(1)}k`
    : `${summary.volumeLbs}`;

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>

      {/* ── Celebration Header ── */}
      <View style={{ paddingTop: insets.top + 32, paddingBottom: 28, alignItems: 'center', paddingHorizontal: 24 }}>
        {/* Icon with pulse */}
        <Animated.View entering={ZoomIn.duration(500).springify().damping(12)} style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <PulseRing />
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(16,185,129,0.12)',
              borderWidth: 2,
              borderColor: '#10b981',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={38} color="#10b981" strokeWidth={2} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: 'center' }}>
          <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
            Workout complete
          </Text>
          <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 }}>
            {summary.name}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '500', marginTop: 4 }}>
            {summary.durationMins} minutes · {summary.setsCompleted} of {summary.totalSets} sets done
          </Text>
        </Animated.View>
      </View>

      {/* ── Stats Grid ── */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <StatCard
            icon={<Clock size={14} color="#6b7280" />}
            label="Duration"
            value={`${summary.durationMins}m`}
          />
          <StatCard
            icon={<Zap size={14} color="#6b7280" />}
            label="Volume"
            value={volDisplay}
            unit="lbs"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard
            icon={<Target size={14} color="#6b7280" />}
            label="Sets done"
            value={`${summary.setsCompleted}/${summary.totalSets}`}
          />
          <StatCard
            icon={<Trophy size={14} color={summary.prs > 0 ? '#fbbf24' : '#6b7280'} />}
            label="PRs"
            value={summary.prs > 0 ? `${summary.prs}` : '—'}
            accent={summary.prs > 0}
          />
        </View>
      </Animated.View>

      {/* ── Exercise Breakdown ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      >
        <Text style={{ color: '#a1a1aa', fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
          Exercise breakdown
        </Text>

        {summary.exercises.map((ex, i) => {
          const completedSets = ex.sets.filter(s => s.completed);
          return (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(400 + i * 70).duration(300)}
              style={{
                backgroundColor: '#1c1c21',
                borderWidth: 1,
                borderColor: '#313138',
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
              }}
            >
              {/* Exercise name row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: completedSets.length > 0 ? 10 : 0 }}>
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>{ex.name}</Text>
                <Text style={{ color: completedSets.length > 0 ? '#10b981' : '#6b7280', fontSize: 11, fontWeight: '700' }}>
                  {completedSets.length}/{ex.sets.length} sets
                </Text>
              </View>

              {/* Sets */}
              {completedSets.length > 0 ? (
                <View style={{ gap: 4 }}>
                  {completedSets.map((s, j) => (
                    <View
                      key={j}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#10b981', fontSize: 9, fontWeight: '900' }}>{j + 1}</Text>
                      </View>
                      <Text style={{ color: '#a3a3a3', fontSize: 13, fontWeight: '600' }}>
                        {s.weight > 0 ? `${s.weight} lbs × ${s.reps} reps` : `${s.reps} reps (bodyweight)`}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: '#52525b', fontSize: 12, fontWeight: '500' }}>No sets completed</Text>
              )}
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* ── Sticky Bottom ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 36,
          backgroundColor: '#09090b',
          borderTopWidth: 1,
          borderTopColor: '#141414',
          gap: 10,
        }}
      >
        <Pressable
          onPress={handleDone}
          style={{ backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center' }}
          className="active:opacity-80"
        >
          <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>
            Done
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
