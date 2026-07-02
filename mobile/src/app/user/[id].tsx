import React from 'react';
import { View, Text, ScrollView, Pressable } from '@/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Award, Dumbbell, UserPlus, Flame } from 'lucide-react-native';
import MuscleHeatmap from '@/components/MuscleHeatmap';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // In a real app, fetch user data based on ID.
  const userName = id === 'user-1' ? 'Alex Chen' : id === 'user-2' ? 'Sarah Miller' : 'David Kim';
  const initials = userName.split(' ').map(n => n[0]).join('');

  return (
    <View className="flex-1" style={{ backgroundColor: '#09090b' }}>
      {/* Header */}
      <View className="pb-4 px-5 flex-row justify-between items-center z-10 border-b border-neutral-900" style={{ backgroundColor: '#09090b', paddingTop: insets.top + 20 }}>
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <ChevronLeft size={26} color="#a1a1aa" />
        </Pressable>
        <Text className="text-[17px] font-semibold text-white tracking-tight">{userName}</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-indigo-500/20 rounded-full items-center justify-center mb-4 border border-indigo-500/30">
            <Text className="text-3xl font-bold text-indigo-400">{initials}</Text>
          </View>
          <Text className="text-2xl font-bold text-white tracking-tight">{userName}</Text>
          <Text className="text-neutral-400 font-medium mb-5">Elite athlete</Text>

          <Pressable className="px-6 py-2.5 rounded-full flex-row items-center active:opacity-80" style={{ backgroundColor: '#4f46e5' }}>
            <UserPlus size={18} color="white" className="mr-2" />
            <Text className="text-white font-semibold text-sm">Follow</Text>
          </Pressable>
        </View>

        {/* Head to Head Stats */}
        <View className="mb-6">
          <Text className="text-white font-semibold text-[17px] mb-3">Head-to-head (this week)</Text>
          <View className="rounded-xl p-5" style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}>
            {/* Volume Compare */}
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-1">
                <Text className="text-white font-semibold text-xl">15.2k</Text>
                <Text className="text-indigo-400 text-[12px] font-medium mt-0.5">Them</Text>
              </View>
              <View className="flex-[1.5] items-center">
                <Text className="text-neutral-500 font-medium text-[12px] mb-1.5">Volume</Text>
                <View className="w-full h-2 rounded-full flex-row overflow-hidden" style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}>
                  <View className="flex-1" style={{ backgroundColor: '#4f46e5' }} />
                  <View className="flex-1" style={{ backgroundColor: '#52525b' }} />
                </View>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-white font-semibold text-xl">12.4k</Text>
                <Text className="text-neutral-500 text-[12px] font-medium mt-0.5">You</Text>
              </View>
            </View>

            {/* Streak Compare */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-semibold text-xl">5</Text>
                <Text className="text-indigo-400 text-[12px] font-medium mt-0.5">Them</Text>
              </View>
              <View className="flex-[1.5] items-center">
                <Text className="text-neutral-500 font-medium text-[12px] mb-1.5">Streak</Text>
                <View className="flex-row gap-2">
                  <Flame size={16} color="#818cf8" />
                  <Flame size={16} color="#52525b" />
                </View>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-white font-semibold text-xl">3</Text>
                <Text className="text-neutral-500 text-[12px] font-medium mt-0.5">You</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Public Heatmap */}
        <View className="rounded-xl p-5 mb-8" style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}>
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-semibold text-[17px] tracking-tight">Muscle recovery</Text>
              <Text className="text-neutral-400 text-xs mt-0.5">See what {userName.split(' ')[0]} trained recently</Text>
            </View>
            <Dumbbell size={20} color="#818cf8" />
          </View>

          <MuscleHeatmap />
        </View>

      </ScrollView>
    </View>
  );
}
