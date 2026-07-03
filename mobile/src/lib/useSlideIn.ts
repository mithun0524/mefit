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
  // elev: 1 while the page is travelling, 0 once settled — drives the edge shadow
  // so the incoming screen reads as a card sliding OVER, then flattens flush.
  const elev = useSharedValue(0);
  const dir = useSharedValue(1);
  const style = useAnimatedStyle(() => {
    // Shadow sits on the trailing edge (the side facing the screen it covers).
    const off = -dir.value * 18 * elev.value;
    return {
      transform: [{ translateX: x.value }],
      boxShadow: `${off}px 0px 32px 0px rgba(0,0,0,${0.55 * elev.value})`,
    };
  });
  useFocusEffect(
    useCallback(() => {
      const from = lastTabIndex;
      lastTabIndex = tabIndex;
      if (from === tabIndex) return undefined; // same tab / first mount → no slide
      const d = tabIndex > from ? 1 : -1; // right = +, left = -
      dir.value = d;
      elev.value = 1;
      x.value = d * SCREEN_WIDTH;
      x.value = withTiming(0, { duration });
      elev.value = withTiming(0, { duration: duration + 120 });
      return undefined;
    }, [tabIndex, duration]),
  );
  return style;
}
