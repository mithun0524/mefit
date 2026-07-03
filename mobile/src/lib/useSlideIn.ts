import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Tracks the last-focused tab index so we know which way navigation moved.
let lastTabIndex = 0;

/**
 * Direction-aware tab transition. Pass the tab's position in the bar (0-based).
 * Moving to a tab on the RIGHT → the page slides in from the right.
 * Moving to a tab on the LEFT → it slides in from the left.
 * No remount, so screen state is preserved.
 */
export function useTabSlide(tabIndex: number, duration = 240) {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  useFocusEffect(
    useCallback(() => {
      const from = lastTabIndex;
      lastTabIndex = tabIndex;
      if (from === tabIndex) return undefined; // same tab / first mount → no slide
      const dir = tabIndex > from ? 1 : -1; // right = +, left = -
      x.value = dir * SCREEN_WIDTH;
      x.value = withTiming(0, { duration });
      return undefined;
    }, [tabIndex, duration]),
  );
  return style;
}
