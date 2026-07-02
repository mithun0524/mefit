import React from 'react';
import { View, Text } from '@/tw';
import { MUSCLE_RECOVERY, muscleTint } from '@/lib/readiness';

export default function MuscleHeatmap() {
  return (
    <View className="flex-row flex-wrap gap-3">
      {MUSCLE_RECOVERY.map((muscle) => {
        const theme = muscleTint(muscle.recovery);
        return (
          <View
            key={muscle.name}
            style={{ backgroundColor: theme.bg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 12 }}
            className="w-[47%] p-3 flex-row justify-between items-center"
          >
            <Text className="text-white font-semibold text-[13px]">{muscle.name}</Text>
            <Text style={{ color: theme.text }} className="font-semibold text-[13px]">{muscle.recovery}%</Text>
          </View>
        );
      })}
    </View>
  );
}
