import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from '@/tw';
import { useRouter, Link } from 'expo-router';
import { Mail, Lock, Dumbbell, ArrowRight } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';

export default function LoginScreen() {
  const router = useRouter();
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = () => {
    if (!email.trim() || !password.trim()) return;
    setAuthenticated(true);
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-neutral-950 px-6 justify-center">
      <View className="items-center mb-12">
        <View className="w-20 h-20 bg-indigo-500/10 rounded-3xl items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
          <Dumbbell size={40} color="#818cf8" strokeWidth={1.5} />
        </View>
        <Text className="text-4xl font-extrabold text-white mb-3 tracking-tight">Welcome back</Text>
        <Text className="text-base text-neutral-400 text-center font-medium">
          Log in to track your progress and talk to your AI coach.
        </Text>
      </View>

      <View className="space-y-4 gap-5">
        <View>
          <Text className="text-sm font-bold text-neutral-400 mb-2 ml-1 tracking-wider uppercase">Email</Text>
          <View className="flex-row items-center bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-neutral-800 transition-colors">
            <Mail size={20} color="#6b7280" className="mr-3" />
            <TextInput
              className="flex-1 text-lg text-white font-medium"
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-bold text-neutral-400 mb-2 ml-1 tracking-wider uppercase">Password</Text>
          <View className="flex-row items-center bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 focus:border-indigo-500 focus:bg-neutral-800 transition-colors">
            <Lock size={20} color="#6b7280" className="mr-3" />
            <TextInput
              className="flex-1 text-lg text-white font-medium"
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <Pressable 
          onPress={handleLogin}
          className="bg-indigo-600 py-5 rounded-2xl items-center justify-center flex-row mt-6 active:bg-indigo-700 shadow-[0_10px_25px_rgba(79,70,229,0.3)]"
        >
          <Text className="text-white font-extrabold text-lg mr-2 tracking-wide">LOG IN</Text>
          <ArrowRight size={20} color="white" />
        </Pressable>
      </View>

      <View className="flex-row justify-center mt-10 gap-2">
        <Text className="text-neutral-500 text-base font-medium">Don't have an account?</Text>
        <Link href="/auth/signup" asChild>
          <Pressable>
            <Text className="text-indigo-400 font-bold text-base">Sign up</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
