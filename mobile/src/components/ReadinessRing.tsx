import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  score: number;      // 0-100
  color: string;
  size?: number;
  stroke?: number;
};

// Circular progress ring — the arc + number animate/count-up from the previous
// value to the new one (0 on first mount), so it feels alive when readiness changes.
export default function ReadinessRing({ score, color, size = 84, stroke = 6 }: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const c = size / 2;

  const [val, setVal] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const from = prev.current;
    const to = score;
    prev.current = to;
    const dur = 650;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setVal(from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const clamped = Math.max(0, Math.min(100, val));
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke="#2e2e34" strokeWidth={stroke} fill="none" />
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
      <Text style={{ color: '#ffffff', fontSize: size * 0.32, fontWeight: '700', letterSpacing: -0.5 }}>{Math.round(clamped)}</Text>
    </View>
  );
}
