import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image } from '@/tw';
import { Flame, Activity, TrendingUp, Sparkles, ArrowRight, Trophy } from 'lucide-react-native';
import MuscleHeatmap from '@/components/MuscleHeatmap';
import ReadinessRing from '@/components/ReadinessRing';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import { computeReadiness, readinessLabel, readinessColor, type Energy } from '@/lib/readiness';
import { computeMuscleRecovery } from '@/lib/recovery';
import { deriveDashboardStats, todayKey } from '@/lib/stats';
import { getHealthSignals, hasHealthData, type HealthSignals } from '@/lib/health';
import { useTabSlide } from '@/lib/useSlideIn';

const ENERGY_OPTIONS: { key: Exclude<Energy, null>; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'good', label: 'Good' },
  { key: 'high', label: 'High' },
];

const WEEK_GOAL = 7;
// Elevated "material" card — lighter than the canvas, hairline light border, soft drop shadow.
const CARD = {
  backgroundColor: '#17171c',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.07)',
  borderRadius: 22,
  padding: 20,
  boxShadow: '0px 14px 34px -14px rgba(0,0,0,0.75)',
} as const;

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, workouts, routines, energyToday, setEnergyToday, settings } = useAppStore();
  const { name, avatarImage } = profile;
  const slide = useTabSlide(0);

  // Persisted, date-stamped energy check (resets daily, survives reload).
  const tk = todayKey();
  const energy: Energy = energyToday && energyToday.date === tk ? energyToday.value : null;
  const setEnergy = (v: Energy) => setEnergyToday(v ? { date: tk, value: v } : null);

  const stats = useMemo(() => deriveDashboardStats(workouts, Date.now(), settings.firstDayMonday), [workouts, settings.firstDayMonday]);

  // Device health signals (HRV/sleep) — null on web, real on a device build.
  const [health, setHealth] = useState<HealthSignals | null>(null);
  useEffect(() => { getHealthSignals().then(setHealth); }, []);

  // Real muscle recovery from the workout log → feeds readiness + the AI insight.
  const recovery = useMemo(() => computeMuscleRecovery(workouts), [workouts]);
  const readiness = useMemo(() => computeReadiness(recovery, energy, health), [recovery, energy, health]);
  const rColor = readinessColor(readiness);
  const rLabel = readinessLabel(readiness);
  const sorted = useMemo(() => [...recovery].sort((a, b) => a.recovery - b.recovery), [recovery]);
  const weakest = sorted[0];
  const readinessNote = readiness >= 75 ? 'All major groups recovered' : `${weakest.name} still fatigued (${weakest.recovery}%)`;

  // Dynamic AI copy from the real recovery state.
  const listPhrase = (xs: string[]) => xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
  const freshNames = recovery.filter(m => m.recovery >= 70).map(m => m.name);
  const tiredNames = recovery.filter(m => m.recovery < 40).map(m => m.name);
  const freshLabel = freshNames.length ? `${listPhrase(freshNames)} ${freshNames.length === 1 ? 'is' : 'are'} fresh` : 'Most muscle groups are still recovering';
  const tiredLabel = tiredNames.length ? ` ${listPhrase(tiredNames)} still need${tiredNames.length === 1 ? 's' : ''} recovery.` : '';

  const maxVol = Math.max(...stats.weeklyK, 1);
  const minVol = Math.min(...stats.weeklyK);
  const topRoutine = routines[0]?.name ?? 'a routine';

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
  };

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: '#09090b' }, slide]}>
      {/* Ambient indigo glow behind the top of the screen — subtle depth */}
      <LinearGradient
        colors={['rgba(99,102,241,0.18)', 'rgba(99,102,241,0.04)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
        pointerEvents="none"
      />
      {/* Header */}
      <View style={{ paddingTop: insets.top + 20, paddingBottom: 10, paddingHorizontal: 20 }} className="flex-row justify-between items-center z-10">
        <View>
          <Text className="text-2xl font-bold text-white tracking-tight">Overview</Text>
          <Text className="text-neutral-500 text-[13px] mt-0.5">Ready to crush it today?</Text>
        </View>
        <View className="flex-row items-center gap-3">
          {stats.streak > 0 && (
            <View className="flex-row items-center bg-orange-500/10 px-2.5 py-1.5 rounded-full">
              <Flame size={13} color="#fb923c" />
              <Text className="text-orange-400 font-semibold text-[13px] ml-1">{stats.streak}</Text>
            </View>
          )}
          <Pressable onPress={() => router.push('/(tabs)/profile')} className="w-10 h-10 rounded-full overflow-hidden border border-indigo-500/40 bg-indigo-500/15 items-center justify-center active:opacity-80">
            {avatarImage ? (
              <Image source={{ uri: avatarImage }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-indigo-400 font-semibold text-sm">{getInitials(name)}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ① Training readiness — hero */}
        <Animated.View entering={FadeInDown.duration(500).springify()} style={{ ...CARD, marginBottom: 20 }}>
          <View className="flex-row items-center">
            <ReadinessRing score={readiness} color={rColor} size={88} stroke={7} />
            <View className="flex-1 ml-5">
              <View className="flex-row items-center mb-1">
                <Text className="text-neutral-500 text-[12px]">Training readiness</Text>
                {hasHealthData(health) && (
                  <View className="flex-row items-center ml-2">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                    <Text className="text-emerald-500 text-[11px] font-medium">Synced</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: rColor }} className="text-xl font-bold tracking-tight">{rLabel}</Text>
              <Text className="text-neutral-500 text-[12px] mt-1">{readinessNote}</Text>
            </View>
          </View>

          <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#26262c' }}>
            <Text className="text-neutral-400 text-[13px] mb-2.5">How's your energy today?</Text>
            <View className="flex-row gap-2.5">
              {ENERGY_OPTIONS.map(opt => {
                const active = energy === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setEnergy(active ? null : opt.key)}
                    style={{ backgroundColor: active ? '#4f46e5' : '#26262c' }}
                    className="flex-1 py-2.5 rounded-lg items-center active:opacity-70"
                  >
                    <Text style={{ color: active ? '#ffffff' : '#a1a1aa' }} className="font-medium text-[13px]">{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ② AI coach insight — the action */}
        <Animated.View entering={FadeInDown.delay(80).duration(500).springify()} style={{ ...CARD, marginBottom: 20 }}>
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 bg-indigo-500/15 rounded-full items-center justify-center mr-2">
              <Sparkles size={14} color="#818cf8" />
            </View>
            <Text className="text-indigo-400 font-medium text-[13px]">AI coach insight</Text>
          </View>

          <Text className="text-white text-lg font-bold mb-1 tracking-tight">Muscle group recommendation</Text>
          <Text className="text-neutral-400 text-[13px] mb-4 leading-relaxed">
            You're at <Text style={{ color: rColor }} className="font-semibold">{readiness}% readiness</Text>. {freshLabel} — a good day for your <Text className="text-white font-semibold">{topRoutine}</Text> routine.{tiredLabel}
          </Text>

          <View className="flex-row gap-3">
            <Pressable onPress={() => router.push('/(tabs)/workout')} style={{ backgroundColor: '#4f46e5' }} className="px-5 py-2.5 rounded-xl flex-row items-center justify-center active:opacity-80">
              <Text className="text-white font-semibold text-[13px] mr-1.5">Start routine</Text>
              <ArrowRight size={13} color="white" />
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/(tabs)/coach', params: { q: `Why is my training readiness ${readiness}% today, and what should I focus on?` } })}
              style={{ borderWidth: 1, borderColor: '#313138' }}
              className="px-4 py-2.5 rounded-xl flex-row items-center justify-center active:opacity-70"
            >
              <Text className="text-neutral-300 font-medium text-[13px]">Ask why</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ③ Muscle recovery */}
        <Animated.View entering={FadeInDown.delay(160).duration(500).springify()} style={{ ...CARD, marginBottom: 20 }}>
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-bold text-base tracking-tight">Muscle recovery</Text>
              <Text className="text-neutral-500 text-[12px] mt-0.5">Estimated from training volume</Text>
            </View>
            <Activity size={18} color="#818cf8" />
          </View>

          <MuscleHeatmap muscles={recovery} />

          <View className="flex-row justify-between mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: '#26262c' }}>
            <View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-green-500 mr-2" /><Text className="text-[11px] text-neutral-400">Fresh</Text></View>
            <View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" /><Text className="text-[11px] text-neutral-400">Recovering</Text></View>
            <View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-red-500 mr-2" /><Text className="text-[11px] text-neutral-400">Fatigued</Text></View>
          </View>
        </Animated.View>

        {/* ④ Streak — this week's consistency (real) */}
        <Animated.View entering={FadeInDown.delay(240).duration(500).springify()} style={{ ...CARD, marginBottom: 20 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-bold text-base tracking-tight">Weekly streak</Text>
            <View className="flex-row items-center bg-orange-500/10 px-3 py-1 rounded-full">
              <Flame size={13} color="#fb923c" />
              <Text className="text-orange-400 font-semibold text-xs ml-1">{stats.streak} {stats.streak === 1 ? 'day' : 'days'}</Text>
            </View>
          </View>
          <View className="flex-row justify-between mb-4">
            {stats.weekLabels.map((day, idx) => {
              const isActive = stats.weekDots[idx];
              return (
                <View
                  key={idx}
                  style={isActive ? { backgroundColor: '#4f46e5' } : { backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}
                  className="w-9 h-9 rounded-full items-center justify-center"
                >
                  <Text className={`font-semibold text-xs ${isActive ? 'text-white' : 'text-neutral-500'}`}>{day}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ height: 6, borderRadius: 4, backgroundColor: '#26262c', overflow: 'hidden' }}>
            <View style={{ height: 6, borderRadius: 4, width: `${(stats.daysThisWeek / WEEK_GOAL) * 100}%`, backgroundColor: '#4f46e5' }} />
          </View>
          <Text className="text-neutral-500 text-[12px] mt-2.5">
            {stats.daysThisWeek >= WEEK_GOAL
              ? 'Perfect week — every day trained 🎉'
              : `${stats.daysThisWeek}/${WEEK_GOAL} days this week`}
          </Text>
        </Animated.View>

        {/* ⑤ Progress — reflective (real) */}
        <Animated.View entering={FadeInDown.delay(320).duration(500).springify()} style={CARD}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <TrendingUp size={16} color="#818cf8" />
              <Text className="text-white font-bold text-base tracking-tight ml-2">Progress</Text>
            </View>
            <Text className="text-neutral-500 text-[12px]">Last 4 weeks</Text>
          </View>

          {stats.hasData ? (
            <>
              <View className="flex-row items-end justify-between" style={{ height: 84 }}>
                {stats.weeklyK.map((v, i) => {
                  const last = i === stats.weeklyK.length - 1;
                  const h = 16 + ((v - minVol) / ((maxVol - minVol) || 1)) * 52;
                  return (
                    <View key={i} className="flex-1 items-center" style={{ marginHorizontal: 6 }}>
                      {last && <Text style={{ color: '#a5b4fc' }} className="text-[11px] font-semibold mb-1.5">{v}k</Text>}
                      <View style={{ width: '100%', height: h, borderRadius: 8, backgroundColor: last ? '#4f46e5' : '#33333b' }} />
                      <Text className="text-neutral-600 text-[10px] mt-2">{`W${i + 1}`}</Text>
                    </View>
                  );
                })}
              </View>

              <View className="flex-row items-center justify-between mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: '#26262c' }}>
                <View>
                  <Text className="text-white font-bold text-lg">{stats.thisWeekK}k lbs</Text>
                  <Text className="text-indigo-400 text-[12px] font-medium mt-0.5">{stats.deltaPct >= 0 ? '+' : ''}{stats.deltaPct}% vs last week</Text>
                </View>
                {stats.prsThisMonth > 0 && (
                  <View className="flex-row items-center px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.1)' }}>
                    <Trophy size={13} color="#fbbf24" />
                    <Text style={{ color: '#fbbf24' }} className="font-semibold text-[12px] ml-1.5">{stats.prsThisMonth} PR{stats.prsThisMonth === 1 ? '' : 's'} this month</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View className="items-center py-6">
              <Text className="text-neutral-500 text-[13px]">Log your first workout to see your trend</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}
