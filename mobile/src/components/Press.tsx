import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const APressable = Animated.createAnimatedComponent(Pressable);

// Tactile iOS-style press: the whole control springs down on touch and settles
// back with a physics spring (per Apple's "Animate with springs" guidance).
export default function Press({
  children,
  onPress,
  style,
  disabled,
  hitSlop,
  accessibilityLabel,
  scaleTo = 0.97,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
  hitSlop?: number;
  accessibilityLabel?: string;
  scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 20, stiffness: 420, mass: 0.5 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 }); }}
      style={[style, animatedStyle]}
    >
      {children}
    </APressable>
  );
}
