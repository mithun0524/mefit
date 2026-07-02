import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from '@/tw';
import { useRouter, Link } from 'expo-router';
import { Mail, Lock, User, Dumbbell } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';

export default function SignupScreen() {
  const router = useRouter();
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setAuthenticated(true);
    router.replace('/onboarding');
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
        <Text className="text-[26px] font-bold text-white mb-2 tracking-tight">Create account</Text>
        <Text className="text-[15px] text-neutral-400 text-center">
          Join today to get a personalized AI fitness coach.
        </Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="text-[13px] text-neutral-500 mb-2 ml-1">Full name</Text>
          <View
            style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }}
            className="flex-row items-center border rounded-xl px-4 py-3.5"
          >
            <User size={18} color="#71717a" className="mr-3" />
            <TextInput
              className="flex-1 text-[16px] text-white"
              placeholder="John Doe"
              placeholderTextColor="#52525b"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

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

        <Pressable
          onPress={handleSignup}
          style={{ backgroundColor: '#4f46e5' }}
          className="py-4 rounded-xl items-center justify-center mt-4 active:opacity-85"
        >
          <Text className="text-white font-semibold text-[15px]">Create account</Text>
        </Pressable>
      </View>

      <View className="flex-row justify-center mt-10 gap-1.5">
        <Text className="text-neutral-500 text-[14px]">Already have an account?</Text>
        <Link href="/auth/login" asChild>
          <Pressable>
            <Text className="text-indigo-400 font-semibold text-[14px]">Log in</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
