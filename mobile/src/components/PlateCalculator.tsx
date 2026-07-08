import React, { useMemo } from 'react';
import { View, Text } from 'react-native';

interface PlateCalculatorProps {
  weightLbs: number;
  barWeightLbs?: number;
}

// Plate colours — dark-themed, colour-coded like real gym plates
const PLATE_CONFIG: Record<number, { bg: string; border: string; text: string; h: number }> = {
  45:  { bg: '#1e2540', border: '#4f6bd6', text: '#abbcf6', h: 44 },
  35:  { bg: '#1f2a3f', border: '#3b82f6', text: '#93c5fd', h: 38 },
  25:  { bg: '#1f3320', border: '#22c55e', text: '#86efac', h: 34 },
  10:  { bg: '#272210', border: '#eab308', text: '#fde047', h: 30 },
  5:   { bg: '#1e1e1e', border: '#525252', text: '#a3a3a3', h: 26 },
  2.5: { bg: '#1a1a1a', border: '#3f3f3f', text: '#737373', h: 22 },
};

export default function PlateCalculator({ weightLbs, barWeightLbs = 45 }: PlateCalculatorProps) {
  const plates = useMemo(() => {
    let remaining = (weightLbs - barWeightLbs) / 2;
    if (remaining <= 0) return [];

    const result: number[] = [];
    for (const plate of [45, 35, 25, 10, 5, 2.5]) {
      while (remaining >= plate) {
        result.push(plate);
        remaining -= plate;
        remaining = Math.round(remaining * 100) / 100;
      }
    }
    return result;
  }, [weightLbs, barWeightLbs]);

  if (weightLbs <= 0) return null;

  if (weightLbs <= barWeightLbs) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#141414', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6 }}>
        <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 12 }}>Bar only ({barWeightLbs} lbs)</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: '#1e1e1e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      <Text style={{ color: '#6b7280', fontWeight: '700', fontSize: 11, marginRight: 4 }}>Per side:</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
        {plates.map((plate, idx) => {
          const cfg = PLATE_CONFIG[plate] ?? PLATE_CONFIG[2.5];
          return (
            <View
              key={idx}
              style={{
                width: 28,
                height: cfg.h,
                backgroundColor: cfg.bg,
                borderWidth: 1.5,
                borderColor: cfg.border,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '900', color: cfg.text }}>{plate}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
