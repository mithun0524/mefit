import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from '@/tw';
import { Flame, Activity, TrendingUp, CalendarDays, Sparkles, ArrowRight } from 'lucide-react-native';
import MuscleHeatmap from '@/components/MuscleHeatmap';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAppStore();
  const { name, avatarImage } = profile;

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : fullName.substring(0, 2).toUpperCase();
  };

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Sleek SaaS Header */}
      <View className="pt-10 pb-4 px-6 bg-neutral-950 border-b border-neutral-900/60 flex-row justify-between items-center z-10">
        <View>
          <Text className="text-3xl font-extrabold text-white tracking-tight">Overview</Text>
          <Text className="text-neutral-500 font-semibold text-xs mt-0.5">Ready to crush it today?</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')} className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/60 bg-indigo-500/20 items-center justify-center active:opacity-80">
          {avatarImage ? (
            <Image source={{ uri: avatarImage }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-indigo-400 font-black text-sm">{getInitials(name)}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Proactive AI Coach Insight Card */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(500).springify()}
          className="bg-neutral-900 rounded-xl p-5 mb-6 border border-neutral-800 shadow-sm relative overflow-hidden"
        >
          <View className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
          
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 bg-indigo-500/20 rounded-full items-center justify-center border border-indigo-500/30 mr-2">
              <Sparkles size={14} color="#818cf8" />
            </View>
            <Text className="text-indigo-400 font-bold text-xs uppercase tracking-wider">Coach AI Insight</Text>
          </View>
          
          <Text className="text-white text-lg font-bold mb-1 tracking-tight">Muscle Group Recommendation</Text>
          <Text className="text-neutral-400 text-xs font-medium mb-4 leading-relaxed">
            Your hamstrings and quads are fully recovered (100%). We recommend running your <Text className="text-white font-bold">Leg Day Annihilation</Text> routine today.
          </Text>

          <View className="flex-row gap-3">
            <Pressable 
              onPress={() => router.push('/(tabs)/workout')}
              className="bg-indigo-600 px-5 py-2.5 rounded-xl flex-row items-center justify-center active:bg-indigo-700 shadow-sm"
            >
              <Text className="text-white font-bold text-xs tracking-wide mr-1.5 uppercase">Start Routine</Text>
              <ArrowRight size={12} color="white" />
            </Pressable>
            
            <Pressable 
              onPress={() => router.push('/(tabs)/coach')}
              className="bg-neutral-950 border border-neutral-800 px-4 py-2.5 rounded-xl flex-row items-center justify-center active:bg-neutral-900"
            >
              <Text className="text-neutral-300 font-bold text-xs">Ask Why</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Weekly Streak Card */}
        <Animated.View 
          entering={FadeInDown.delay(150).duration(500).springify()}
          className="bg-neutral-900 rounded-xl p-5 mb-6 border border-neutral-800 shadow-sm"
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-bold text-base tracking-tight">Weekly Streak</Text>
            <View className="flex-row items-center bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              <Flame size={14} color="#fb923c" className="mr-1" />
              <Text className="text-orange-400 font-black text-xs">3 days</Text>
            </View>
          </View>
          <View className="flex-row justify-between">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              const isActive = idx === 1 || idx === 3 || idx === 4;
              return (
                <View key={idx} className="items-center">
                  <View className={`w-9 h-9 rounded-full items-center justify-center mb-1 border ${
                    isActive ? 'bg-indigo-600 border-indigo-500 shadow-sm' : 'bg-neutral-950 border-neutral-800'
                  }`}>
                    <Text className={`font-bold text-xs ${isActive ? 'text-white' : 'text-neutral-500'}`}>{day}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Recovery Heatmap Card */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(500).springify()}
          className="bg-neutral-900 rounded-xl p-5 mb-6 border border-neutral-800 shadow-sm"
        >
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white font-bold text-base tracking-tight">Muscle Recovery State</Text>
              <Text className="text-neutral-500 text-[10px] font-semibold mt-0.5">Estimated based on training volume</Text>
            </View>
            <Activity size={18} color="#818cf8" />
          </View>
          
          <MuscleHeatmap />
          
          <View className="flex-row justify-between mt-6 border-t border-neutral-800/50 pt-4">
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2" />
              <Text className="text-[10px] text-neutral-400 font-bold">Fresh (100%)</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-yellow-500 mr-2" />
              <Text className="text-[10px] text-neutral-400 font-bold">Recovering (50%)</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
              <Text className="text-[10px] text-neutral-400 font-bold">Fatigued (0%)</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bento Grid Stats */}
        <View className="flex-row gap-4 mb-8">
          <Animated.View 
            entering={FadeInDown.delay(300).duration(500).springify()}
            className="flex-1 bg-neutral-900 rounded-xl p-4 border border-neutral-800 shadow-sm"
          >
            <View className="w-8 h-8 bg-indigo-500/10 rounded-lg items-center justify-center mb-3">
              <TrendingUp size={16} color="#818cf8" />
            </View>
            <Text className="text-neutral-500 text-[9px] font-bold tracking-wider uppercase mb-0.5">Weekly Volume</Text>
            <Text className="text-xl font-bold text-white">12.4k lbs</Text>
            <Text className="text-[10px] text-indigo-400 font-semibold mt-1">+8% vs last week</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(400).duration(500).springify()}
            className="flex-1 bg-neutral-900 rounded-xl p-4 border border-neutral-800 shadow-sm"
          >
            <View className="w-8 h-8 bg-violet-500/10 rounded-lg items-center justify-center mb-3">
              <CalendarDays size={16} color="#a78bfa" />
            </View>
            <Text className="text-neutral-500 text-[9px] font-bold tracking-wider uppercase mb-0.5">Workouts Completed</Text>
            <Text className="text-xl font-bold text-white">14</Text>
            <Text className="text-[10px] text-neutral-500 font-semibold mt-1">This month</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
