import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  score: number;      // 0-100
  color: string;
  size?: number;
  stroke?: number;
};

// Circular progress ring — arc fills to `score`, colored by readiness zone.
export default function ReadinessRing({ score, color, size = 84, stroke = 6 }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const c = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* track */}
        <Circle cx={c} cy={c} r={r} stroke="#2e2e34" strokeWidth={stroke} fill="none" />
        {/* progress arc */}
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Text style={{ color: '#ffffff', fontSize: size * 0.32, fontWeight: '700', letterSpacing: -0.5 }}>{score}</Text>
    </View>
  );
}
