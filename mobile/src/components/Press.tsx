import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

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
  scaleTo = 0.94,
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
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <APressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      // Snap DOWN fast (so even an instant click registers), then spring back with a little bounce.
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        opacity.value = withTiming(0.85, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220, mass: 0.7 });
        opacity.value = withTiming(1, { duration: 160 });
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </APressable>
  );
}
