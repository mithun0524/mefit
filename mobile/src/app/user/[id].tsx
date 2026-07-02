import React from 'react';
import { View, Text, ScrollView, Pressable } from '@/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Award, Dumbbell, UserPlus, Flame } from 'lucide-react-native';
import MuscleHeatmap from '@/components/MuscleHeatmap';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // In a real app, fetch user data based on ID.
  const userName = id === 'user-1' ? 'Alex Chen' : id === 'user-2' ? 'Sarah Miller' : 'David Kim';
  const initials = userName.split(' ').map(n => n[0]).join('');

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-4 bg-neutral-950 flex-row justify-between items-center z-10 border-b border-neutral-900">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
          <ChevronLeft size={28} color="#ffffff" />
        </Pressable>
        <Text className="text-xl font-bold text-white tracking-tight">{userName}</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-indigo-500/20 rounded-full items-center justify-center mb-4 border border-indigo-500/30">
            <Text className="text-3xl font-bold text-indigo-400">{initials}</Text>
          </View>
          <Text className="text-2xl font-extrabold text-white tracking-tight">{userName}</Text>
          <Text className="text-neutral-400 font-medium mb-4">Elite Athlete</Text>
          
          <Pressable className="bg-indigo-600 px-6 py-2.5 rounded-lg flex-row items-center active:bg-indigo-700 shadow-md">
            <UserPlus size={18} color="white" className="mr-2" />
            <Text className="text-white font-bold text-sm tracking-wide">Follow</Text>
          </Pressable>
        </View>

        {/* Head to Head Stats */}
        <View className="mb-6">
          <Text className="text-white font-bold text-lg mb-3">Head-to-Head (This Week)</Text>
          <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 shadow-sm">
            {/* Volume Compare */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-white font-black text-lg">15.2k</Text>
                <Text className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">THEM</Text>
              </View>
              <View className="flex-[1.5] items-center">
                <Text className="text-neutral-500 font-bold text-xs uppercase tracking-wider mb-1">Volume</Text>
                <View className="w-full h-2 bg-neutral-950 rounded-full flex-row overflow-hidden border border-neutral-800">
                  <View className="flex-1 bg-indigo-500" />
                  <View className="flex-1 bg-neutral-600" />
                </View>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-white font-black text-lg">12.4k</Text>
                <Text className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider">YOU</Text>
              </View>
            </View>

            {/* Streak Compare */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-black text-lg">5</Text>
                <Text className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">THEM</Text>
              </View>
              <View className="flex-[1.5] items-center">
                <Text className="text-neutral-500 font-bold text-xs uppercase tracking-wider mb-1">Streak</Text>
                <View className="flex-row gap-2">
                  <Flame size={16} color="#818cf8" />
                  <Flame size={16} color="#71717a" />
                </View>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-white font-black text-lg">3</Text>
                <Text className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider">YOU</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Public Heatmap */}
        <View className="bg-neutral-900 rounded-xl p-5 mb-8 border border-neutral-800 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-bold text-lg tracking-tight">Muscle Recovery</Text>
              <Text className="text-neutral-400 text-xs">See what {userName.split(' ')[0]} trained recently</Text>
            </View>
            <Dumbbell size={20} color="#818cf8" />
          </View>
          
          <MuscleHeatmap />
        </View>

      </ScrollView>
    </View>
  );
}
