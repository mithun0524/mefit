import React from 'react';
import { View, Text } from '@/tw';

// 0-100 scale: 100 = fully recovered (Green), 0 = fully fatigued (Red)
type MuscleRecovery = {
  name: string;
  recovery: number;
};

const MOCK_MUSCLE_DATA: MuscleRecovery[] = [
  { name: 'Chest', recovery: 85 },
  { name: 'Back', recovery: 60 },
  { name: 'Legs', recovery: 15 }, // Highly fatigued
  { name: 'Shoulders', recovery: 95 },
  { name: 'Arms', recovery: 70 },
  { name: 'Core', recovery: 100 },
];

export default function MuscleHeatmap() {
  const getColor = (recovery: number) => {
    if (recovery >= 80) return { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.3)]' };
    if (recovery >= 40) return { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', shadow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]' };
    return { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]' };
  };

  return (
    <View className="flex-row flex-wrap gap-3">
      {MOCK_MUSCLE_DATA.map((muscle) => {
        const theme = getColor(muscle.recovery);
        return (
          <View 
            key={muscle.name} 
            className={`w-[47%] p-3 rounded-2xl flex-row justify-between items-center border ${theme.bg} ${theme.border} ${theme.shadow}`}
          >
            <Text className="text-white font-bold">{muscle.name}</Text>
            <Text className={`font-black ${theme.text}`}>{muscle.recovery}%</Text>
          </View>
        );
      })}
    </View>
  );
}
