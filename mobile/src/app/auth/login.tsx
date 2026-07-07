import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from '@/tw';
import { useRouter, Link } from 'expo-router';
import { Mail, Lock, Dumbbell } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError(null);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Could not sign in'); return; }
    setAuthenticated(true);
    router.replace('/(tabs)');
  };

  return (
    <View style={{ backgroundColor: '#09090b' }} className="flex-1 px-6 justify-center">
      <View className="items-center mb-12">
        <View
          style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }}
          className="w-16 h-16 rounded-2xl items-center justify-center mb-6 border"
        >
          <Dumbbell size={30} color="#818cf8" strokeWidth={1.75} />
        </View>
        <Text className="text-[26px] font-bold text-white mb-2 tracking-tight">Welcome back</Text>
        <Text className="text-[15px] text-neutral-400 text-center">
          Log in to track your progress and talk to your AI coach.
        </Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="text-[13px] text-neutral-500 mb-2 ml-1">Email</Text>
          <View
            style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }}
            className="flex-row items-center border rounded-xl px-4 py-3.5"
          >
            <Mail size={18} color="#71717a" className="mr-3" />
            <TextInput
              className="flex-1 text-[16px] text-white"
              placeholder="you@example.com"
              placeholderTextColor="#52525b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View>
          <Text className="text-[13px] text-neutral-500 mb-2 ml-1">Password</Text>
          <View
            style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }}
            className="flex-row items-center border rounded-xl px-4 py-3.5"
          >
            <Lock size={18} color="#71717a" className="mr-3" />
            <TextInput
              className="flex-1 text-[16px] text-white"
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        {error ? (
          <Text className="text-[13px] text-red-400 ml-1 -mt-1">{error}</Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={{ backgroundColor: '#4f46e5', opacity: loading ? 0.6 : 1 }}
          className="py-4 rounded-xl items-center justify-center mt-4 active:opacity-85"
        >
          <Text className="text-white font-semibold text-[15px]">{loading ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>
      </View>

      <View className="flex-row justify-center mt-10 gap-1.5">
        <Text className="text-neutral-500 text-[14px]">Don't have an account?</Text>
        <Link href="/auth/signup" asChild>
          <Pressable>
            <Text className="text-indigo-400 font-semibold text-[14px]">Sign up</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
