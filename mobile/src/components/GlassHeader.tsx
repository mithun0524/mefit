import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// iOS-style frosted navigation header: an absolute translucent glass bar that
// content scrolls beneath. Provides the material + specular hairline; children
// define their own row layout. Pair with a matching scroll paddingTop
// (≈ insets.top + 92) so content clears it.
export default function GlassHeader({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingTop: insets.top + 16, paddingBottom: 12, paddingHorizontal: 20 }}
    >
      <View style={StyleSheet.absoluteFill}>
        <BlurView tint="dark" intensity={28} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(9,9,11,0.45)' }]} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      </View>
      {children}
    </View>
  );
}

// The top padding a screen's scroll content needs to clear the glass header.
export const glassHeaderPad = (insetTop: number) => insetTop + 92;
