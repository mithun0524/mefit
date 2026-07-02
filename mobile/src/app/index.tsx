import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function AppEntry() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
