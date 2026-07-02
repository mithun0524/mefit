import React, { useMemo, useState } from 'react';
import { View, Text } from '@/tw';
import { TrendingUp, TrendingDown, LineChart } from 'lucide-react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import type { WorkoutRecord } from '@/store/useAppStore';
import { exerciseVolumeSeries, exerciseBests } from '@/lib/history';

// Measured sparkline (real px, so stroke stays even).
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const [w, setW] = useState(0);
  const H = 44;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = w > 0 && data.length > 1
    ? data.map((v, i) => {
        const x = (i / (data.length - 1)) * (w - 4) + 2;
        const y = H - 4 - ((v - min) / range) * (H - 8);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
    : [];

  const lastX = pts.length ? Number(pts[pts.length - 1].split(',')[0]) : 0;
  const lastY = pts.length ? Number(pts[pts.length - 1].split(',')[1]) : 0;

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={{ height: H, width: '100%' }}>
      {pts.length > 0 && (
        <Svg width={w} height={H}>
          <Polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={lastX} cy={lastY} r={3} fill={color} />
        </Svg>
      )}
    </View>
  );
}

export default function ExerciseProgress({ workouts }: { workouts: WorkoutRecord[] }) {
  const { names, bests } = useMemo(() => {
    const counts: Record<string, number> = {};
    workouts.forEach(w => (w.loggedExercises ?? []).forEach(e => { counts[e.name] = (counts[e.name] || 0) + 1; }));
    const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 4);
    return { names, bests: exerciseBests(workouts) };
  }, [workouts]);

  return (
    <View style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }} className="rounded-xl p-5 mb-4">
      <View className="flex-row items-center mb-4">
        <LineChart size={16} color="#818cf8" />
        <Text className="text-white font-semibold text-sm ml-1.5">Strength progression</Text>
      </View>

      {names.length === 0 ? (
        <View className="items-center py-6">
          <Text className="text-neutral-500 text-[13px]">Log a few workouts to see your lifts trend over time</Text>
        </View>
      ) : (
        names.map((name, idx) => {
          const series = exerciseVolumeSeries(workouts, name).map(p => p.volume);
          const best = bests[name];
          const trend = series.length >= 2 && series[0] > 0
            ? Math.round(((series[series.length - 1] - series[0]) / series[0]) * 100)
            : 0;
          const up = trend >= 0;
          return (
            <View key={name} style={idx > 0 ? { borderTopWidth: 1, borderTopColor: '#26262c', paddingTop: 14, marginTop: 14 } : undefined}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-white font-medium text-[14px]" numberOfLines={1}>{name}</Text>
                {best ? <Text className="text-neutral-500 text-[12px]">best ~{best.e1rm} 1RM</Text> : null}
              </View>
              {series.length >= 2 ? (
                <>
                  <Sparkline data={series} color="#818cf8" />
                  <View className="flex-row items-center mt-1">
                    {up ? <TrendingUp size={12} color="#10b981" /> : <TrendingDown size={12} color="#f87171" />}
                    <Text style={{ color: up ? '#10b981' : '#f87171' }} className="text-[12px] font-medium ml-1">{up ? '+' : ''}{trend}% volume</Text>
                    <Text className="text-neutral-600 text-[12px] ml-2">· {series.length} sessions</Text>
                  </View>
                </>
              ) : (
                <Text className="text-neutral-600 text-[12px]">1 session logged — one more to chart a trend</Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
