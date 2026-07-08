import '../global.css';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { restoreSession } from '@/lib/auth';
import { useAppStore } from '@/store/useAppStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // When a real Supabase project is configured, the persisted session is the
  // source of truth for auth. In local mode restoreSession() returns null and
  // we keep the persisted local flag untouched.
  useEffect(() => {
    restoreSession().then(active => {
      if (active !== null) useAppStore.getState().setAuthenticated(active);
    });
  }, []);

  if (!fontsLoaded) return null;

  // On web, cap the app to a phone-width column centered on the page so wide
  // screens read as an intentional device frame instead of a stretched layout.
  const webShell = Platform.OS === 'web'
    ? { flex: 1, width: '100%' as const, maxWidth: 480, alignSelf: 'center' as const }
    : { flex: 1 };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#09090b' }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={webShell}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090b' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workout-summary" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        </Stack>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
