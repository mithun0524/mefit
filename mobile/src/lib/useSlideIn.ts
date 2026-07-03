import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Slide a screen in from the right each time it gains focus.
// Tab switches don't animate on web, so this gives every tab a consistent
// page transition without remounting (state is preserved).
export function useSlideIn(duration = 280) {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  useFocusEffect(
    useCallback(() => {
      x.value = SCREEN_WIDTH;
      x.value = withTiming(0, { duration });
      return undefined;
    }, [duration]),
  );
  return style;
}
