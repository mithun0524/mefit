import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image } from '@/tw';
import { Settings, Activity, Play, Calendar, X, Check, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { Modal, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '@/store/useAppStore';
import ExerciseProgress from '@/components/ExerciseProgress';

// Consistency grid mock data
const HEATMAP_DATA = [
  2, 0, 1, 3, 0, 2, 0,
  0, 1, 0, 2, 0, 3, 0,
  1, 0, 2, 0, 1, 0, 2,
  0, 3, 0, 1, 0, 2, 0,
  2, 0, 1, 0, 3, 0, 1
];

// Preset Avatars from Unsplash
const PRESET_AVATARS = [
  { id: 'av-1', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop', name: 'Athlete 1' },
  { id: 'av-2', url: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=200&auto=format&fit=crop', name: 'Athlete 2' },
  { id: 'av-3', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=200&auto=format&fit=crop', name: 'Coach 1' },
  { id: 'av-4', url: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=200&auto=format&fit=crop', name: 'Coach 2' }
];


export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'activity' | 'analytics' | 'routines'>('activity');

  // --- Global Store ---
  const { profile, workouts, routines, updateProfile, setAuthenticated } = useAppStore();
  const { name, username, bio, avatarImage, unit, isPrivate, weight, height, openAIApiKey } = profile;

  // --- Modal Visibility States ---
  const [editVisible, setEditVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // --- Temporary Modal Editor States ---
  const [editName, setEditName] = useState(name);
  const [editUsername, setEditUsername] = useState(username);
  const [editBio, setEditBio] = useState(bio);
  const [editAvatarImage, setEditAvatarImage] = useState(avatarImage);
  const [editApiKey, setEditApiKey] = useState(openAIApiKey);

  // --- Toast Alert Notification ---
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const saveProfile = () => {
    updateProfile({
      name: editName,
      username: editUsername,
      bio: editBio,
      avatarImage: editAvatarImage,
      openAIApiKey: editApiKey,
    });
    setEditVisible(false);

    // Trigger success toast
    triggerToast('Profile updated successfully! ✨');
  };

  // Copy share profile link
  const shareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${name}'s training profile on Silly Galileo`,
      });
    } catch (error) {
      // Ignore AbortError when share is canceled on Web
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  // Select local image from camera roll
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      triggerToast('Permission to access photos is required! ⚠️');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEditAvatarImage(base64Uri);
      triggerToast('Selected local photo! 📸');
    }
  };

  // Get initials from Name string (fallback if image is missing)
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // Calculate volume mathematically based on imperial/metric toggling
  const formatTotalVolume = (volumeLbs: number) => {
    if (unit === 'kgs') {
      const volKgs = Math.round(volumeLbs * 0.453592);
      return `${(volKgs / 1000).toFixed(1)}k`;
    }
    return `${(volumeLbs / 1000000).toFixed(1)}M`;
  };

  const formatWorkoutVolume = (volumeLbs: number) => {
    if (unit === 'kgs') {
      const volKgs = Math.round(volumeLbs * 0.453592);
      return `${(volKgs / 1000).toFixed(1)}k kgs`;
    }
    return `${(volumeLbs / 1000).toFixed(1)}k lbs`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 20, backgroundColor: '#09090b', borderBottomWidth: 1, borderBottomColor: '#171717' }}
        className="pb-4 px-5 z-10 flex-row justify-between items-center"
      >
        <Text className="text-3xl font-bold text-white tracking-tight">Profile</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}
          className="w-10 h-10 rounded-xl items-center justify-center active:opacity-70"
        >
          <Settings size={18} color="#a1a1aa" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Info - Instagram Layout */}
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row items-center justify-between mb-5">
            {/* Dynamic Avatar with Image support */}
            <View className="w-20 h-20 rounded-full items-center justify-center border-2 border-indigo-500 overflow-hidden bg-neutral-900">
              {avatarImage ? (
                <Image
                  source={{ uri: avatarImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-2xl font-bold text-indigo-400">{getInitials(name)}</Text>
              )}
            </View>

            {/* Stats Columns */}
            <View className="flex-1 flex-row justify-around ml-4">
              <View className="items-center">
                <Text className="text-xl font-bold text-white">{workouts.length}</Text>
                <Text className="text-[12px] font-medium text-neutral-500 mt-1">Workouts</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-white">{formatTotalVolume(workouts.reduce((sum, w) => sum + w.volumeLbs, 0))}</Text>
                <Text className="text-[12px] font-medium text-neutral-500 mt-1">{unit === 'kgs' ? 'Kgs lifted' : 'Lbs lifted'}</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-white">{workouts.reduce((sum, w) => sum + (w.prs || 0), 0)}</Text>
                <Text className="text-[12px] font-medium text-neutral-500 mt-1">PRs</Text>
              </View>
            </View>
          </View>

          {/* User Bio Details */}
          <View className="flex-row items-center gap-1.5">
            <Text className="text-white font-bold text-lg tracking-tight">{name}</Text>
            {isPrivate && <Lock size={13} color="#a1a1aa" />}
          </View>
          <Text className="text-neutral-500 text-[13px] mt-0.5">@{username}</Text>
          <Text className="text-indigo-400 text-[13px] font-medium mt-1.5 mb-2">Pro member</Text>
          <Text className="text-neutral-400 text-[13px] leading-relaxed">
            {bio}
          </Text>

          {/* Action Row */}
          <View className="flex-row gap-3 mt-5">
            <Pressable
              onPress={() => {
                setEditName(name);
                setEditUsername(username);
                setEditBio(bio);
                setEditAvatarImage(avatarImage);
                setEditApiKey(openAIApiKey);
                setEditVisible(true);
              }}
              className="flex-1 bg-indigo-500 py-3 rounded-xl items-center justify-center active:opacity-80"
            >
              <Text className="text-white font-semibold text-[14px]">Edit profile</Text>
            </Pressable>
            <Pressable
              onPress={shareProfile}
              style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}
              className="flex-1 py-3 rounded-xl items-center justify-center active:opacity-70"
            >
              <Text className="text-neutral-200 font-semibold text-[14px]">Share profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Dynamic Segmented Tab Bar */}
        <View
          style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#171717' }}
          className="flex-row mt-2"
        >
          {(['activity', 'analytics', 'routines'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                  isActive ? 'border-indigo-500' : 'border-transparent'
                }`}
              >
                <Text className={`font-semibold text-[13px] ${
                  isActive ? 'text-indigo-400' : 'text-neutral-500'
                }`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab View Content */}
        <View className="px-5 pt-6 pb-20">
          {activeTab === 'activity' && (
            <Animated.View entering={FadeInDown.duration(300)}>
              {workouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}
                  className="rounded-xl p-5 mb-4 active:opacity-80"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-white font-semibold text-base tracking-tight">{workout.name}</Text>
                    <Text className="text-neutral-500 text-[12px]">{workout.date}</Text>
                  </View>
                  <Text className="text-neutral-400 text-[13px] mb-3">{workout.exercises}</Text>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#313138' }} className="flex-row gap-5 pt-3">
                    <View>
                      <Text className="text-neutral-500 text-[12px] mb-0.5">Duration</Text>
                      <Text className="text-white font-semibold text-sm">{workout.duration}</Text>
                    </View>
                    <View>
                      <Text className="text-neutral-500 text-[12px] mb-0.5">Volume</Text>
                      <Text className="text-white font-semibold text-sm">{formatWorkoutVolume(workout.volumeLbs)}</Text>
                    </View>
                    {workout.prs > 0 && (
                      <View>
                        <Text className="text-neutral-500 text-[12px] mb-0.5">PRs</Text>
                        <Text className="text-emerald-400 font-semibold text-sm">+{workout.prs}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </Animated.View>
          )}

          {activeTab === 'analytics' && (
            <Animated.View entering={FadeInDown.duration(300)}>
              {/* Real strength progression from logged history */}
              <ExerciseProgress workouts={workouts} />

              {/* Consistency Heatmap */}
              <View style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }} className="rounded-xl p-5 mb-4">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <Calendar size={16} color="#818cf8" className="mr-1.5" />
                    <Text className="text-white font-semibold text-sm">Consistency heatmap</Text>
                  </View>
                  <Text className="text-neutral-500 text-[12px]">30 days</Text>
                </View>

                {/* Heatmap Grid */}
                <View className="flex-row flex-wrap justify-between gap-1.5">
                  {HEATMAP_DATA.map((val, idx) => {
                    let bgClass = 'bg-neutral-950 border border-neutral-900';
                    if (val === 1) bgClass = 'bg-indigo-950 border border-indigo-900/40';
                    if (val === 2) bgClass = 'bg-indigo-900/60 border border-indigo-800';
                    if (val === 3) bgClass = 'bg-indigo-500 border border-indigo-400';

                    return (
                      <View
                        key={idx}
                        className={`w-[12%] h-7 rounded-md ${bgClass}`}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Muscle Volume Split */}
              <View style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }} className="rounded-xl p-5">
                <View className="flex-row justify-between items-center mb-5">
                  <View className="flex-row items-center">
                    <Activity size={16} color="#818cf8" className="mr-1.5" />
                    <Text className="text-white font-semibold text-sm">Muscle volume split</Text>
                  </View>
                  <Text className="text-indigo-400 font-medium text-[13px]">This month</Text>
                </View>

                {[
                  { name: 'Chest', pct: 40, color: 'bg-indigo-500' },
                  { name: 'Back', pct: 30, color: 'bg-indigo-400' },
                  { name: 'Legs', pct: 20, color: 'bg-indigo-300' },
                  { name: 'Shoulders', pct: 10, color: 'bg-indigo-200' }
                ].map((item, idx) => (
                  <View key={idx} className="mb-4">
                    <View className="flex-row justify-between mb-1.5 px-0.5">
                      <Text className="text-neutral-300 font-medium text-[13px]">{item.name}</Text>
                      <Text className="text-white font-semibold text-[13px]">{item.pct}%</Text>
                    </View>
                    <View style={{ borderWidth: 1, borderColor: '#313138' }} className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden p-0.5">
                      <View className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === 'routines' && (
            <Animated.View entering={FadeInDown.duration(300)}>
              {routines.map((routine) => (
                <View
                  key={routine.id}
                  style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}
                  className="rounded-xl p-5 mb-4"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-3">
                      <Text className="text-white font-semibold text-base tracking-tight">{routine.name}</Text>
                      <Text className="text-neutral-500 text-[12px] mt-1">{routine.muscles.join(', ')} • {routine.duration}</Text>
                    </View>
                    <Pressable
                      onPress={() => router.replace('/(tabs)/workout')}
                      style={{ backgroundColor: '#4f46e5' }}
                      className="w-9 h-9 rounded-lg items-center justify-center active:opacity-80"
                    >
                      <Play size={13} color="white" fill="white" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* --- EDIT PROFILE BOTTOM SHEET MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editVisible}
        onRequestClose={() => setEditVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setEditVisible(false)} />
          <View style={{ backgroundColor: '#1c1c21', borderTopWidth: 1, borderTopColor: '#313138' }} className="rounded-t-3xl p-5 h-[75%]">
            <View style={{ backgroundColor: '#313138' }} className="w-10 h-1 rounded-full self-center mb-5" />

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-bold text-xl">Edit profile</Text>
              <Pressable
                onPress={() => setEditVisible(false)}
                style={{ backgroundColor: '#26262c' }}
                className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
              >
                <X size={16} color="#a1a1aa" />
              </Pressable>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* Display Name Input */}
              <Text className="text-neutral-400 text-[13px] font-medium mb-1.5 px-0.5">Name</Text>
              <TextInput
                style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}
                className="rounded-lg px-4 py-3 text-white text-[15px] mb-4 focus:border-indigo-500"
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor="#71717a"
              />

              {/* Username Input */}
              <Text className="text-neutral-400 text-[13px] font-medium mb-1.5 px-0.5">Username</Text>
              <TextInput
                style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}
                className="rounded-lg px-4 py-3 text-white text-[15px] mb-4 focus:border-indigo-500"
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Username"
                placeholderTextColor="#71717a"
                autoCapitalize="none"
              />

              {/* Bio Multiline Input */}
              <Text className="text-neutral-400 text-[13px] font-medium mb-1.5 px-0.5">Bio</Text>
              <TextInput
                style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}
                className="rounded-lg px-4 py-3 text-white text-[15px] mb-5 focus:border-indigo-500 h-16"
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Write a bio..."
                placeholderTextColor="#71717a"
                multiline
                numberOfLines={2}
              />

              {/* Native Media Library Picker Button */}
              <Text className="text-neutral-400 text-[13px] font-medium mb-1.5 px-0.5">Profile photo</Text>
              <Pressable
                onPress={pickImage}
                style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}
                className="border-dashed py-3.5 rounded-lg items-center justify-center mb-5 active:opacity-70"
              >
                <Text className="text-indigo-400 font-medium text-[14px]">Choose from device 📸</Text>
              </Pressable>

              {/* Preset Avatars Selection Grid */}
              <Text className="text-neutral-400 text-[13px] font-medium mb-3 px-0.5">Preset avatars</Text>
              <View className="flex-row flex-wrap justify-between gap-3.5 mb-5">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = editAvatarImage === av.url;
                  return (
                    <Pressable
                      key={av.id}
                      onPress={() => setEditAvatarImage(av.url)}
                      className={`w-[22%] h-14 rounded-lg overflow-hidden border-2 relative active:opacity-90 ${
                        isSelected ? 'border-indigo-500' : 'border-neutral-800'
                      }`}
                    >
                      <Image
                        source={{ uri: av.url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {isSelected && (
                        <View className="absolute inset-0 bg-indigo-600/30 items-center justify-center z-10">
                          <Check size={16} color="white" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom Image URL Field */}
              <Text className="text-neutral-400 text-[13px] font-medium mb-1.5 px-0.5">Custom image URL</Text>
              <TextInput
                style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}
                className="rounded-lg px-4 py-3 text-white text-[13px] mb-6 focus:border-indigo-500"
                value={editAvatarImage || ''}
                onChangeText={setEditAvatarImage}
                placeholder="Paste avatar URL..."
                placeholderTextColor="#71717a"
                autoCapitalize="none"
              />

              {/* OpenAI API Key Field */}
              <Text className="text-neutral-400 text-[13px] font-medium mb-1.5 px-0.5">OpenAI API key (for Coach AI)</Text>
              <TextInput
                style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }}
                className="rounded-lg px-4 py-3 text-white text-[13px] mb-6 focus:border-indigo-500"
                value={editApiKey}
                onChangeText={setEditApiKey}
                placeholder="sk-..."
                placeholderTextColor="#71717a"
                secureTextEntry
                autoCapitalize="none"
              />
            </ScrollView>

            <Pressable
              onPress={saveProfile}
              className="bg-indigo-500 py-4 rounded-2xl items-center justify-center active:opacity-85 mt-2"
            >
              <Text className="text-white font-semibold text-[15px]">Save changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* --- APP SETTINGS BOTTOM SHEET MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setSettingsVisible(false)} />
          <View style={{ backgroundColor: '#1c1c21', borderTopWidth: 1, borderTopColor: '#313138' }} className="rounded-t-3xl p-5 h-[65%]">
            <View style={{ backgroundColor: '#313138' }} className="w-10 h-1 rounded-full self-center mb-5" />

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-bold text-xl">App settings</Text>
              <Pressable
                onPress={() => setSettingsVisible(false)}
                style={{ backgroundColor: '#26262c' }}
                className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
              >
                <X size={16} color="#a1a1aa" />
              </Pressable>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* Units Selection - Segmented Toggle */}
              <View style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }} className="rounded-xl p-4 mb-4">
                <Text className="text-white font-semibold text-sm mb-1">Workout units</Text>
                <Text className="text-neutral-500 text-[13px] mb-3">Converts all weights and volume displays instantly.</Text>

                <View style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }} className="flex-row rounded-lg p-1">
                  <Pressable
                    onPress={() => updateProfile({ unit: 'lbs' })}
                    style={unit === 'lbs' ? { backgroundColor: '#4f46e5' } : undefined}
                    className="flex-1 py-2 rounded-md items-center justify-center"
                  >
                    <Text className="text-white font-semibold text-[13px]">Pounds (Lbs)</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateProfile({ unit: 'kgs' })}
                    style={unit === 'kgs' ? { backgroundColor: '#4f46e5' } : undefined}
                    className="flex-1 py-2 rounded-md items-center justify-center"
                  >
                    <Text className="text-white font-semibold text-[13px]">Kilograms (Kgs)</Text>
                  </Pressable>
                </View>
              </View>

              {/* Privacy Setting Toggle */}
              <View style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }} className="rounded-xl p-4 mb-4 flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-white font-semibold text-sm mb-0.5">Private profile</Text>
                  <Text className="text-neutral-500 text-[13px]">Only approved followers can view your workouts & logs.</Text>
                </View>
                <Pressable
                  onPress={() => updateProfile({ isPrivate: !isPrivate })}
                  style={{ backgroundColor: isPrivate ? '#4f46e5' : '#313138' }}
                  className="w-12 h-6.5 rounded-full px-1 justify-center"
                >
                  <View className={`w-5 h-5 rounded-full bg-white transition-all ${isPrivate ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                </Pressable>
              </View>

              {/* Physical Metrics */}
              <View style={{ backgroundColor: '#09090b', borderWidth: 1, borderColor: '#313138' }} className="rounded-xl p-4 mb-6">
                <Text className="text-white font-semibold text-sm mb-3">Physique details</Text>
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-neutral-400 text-[13px] font-medium mb-1.5">Weight</Text>
                    <TextInput
                      style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}
                      className="rounded-lg px-3 py-2 text-white font-medium text-[13px] text-center"
                      value={weight}
                      onChangeText={(val) => updateProfile({ weight: val })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-neutral-400 text-[13px] font-medium mb-1.5">Height</Text>
                    <TextInput
                      style={{ backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138' }}
                      className="rounded-lg px-3 py-2 text-white font-medium text-[13px] text-center"
                      value={height}
                      onChangeText={(val) => updateProfile({ height: val })}
                    />
                  </View>
                </View>
              </View>

              {/* Log Out — demoted text link */}
              <Pressable
                onPress={() => {
                  setSettingsVisible(false);
                  setAuthenticated(false);
                  router.replace('/auth/login');
                }}
                className="items-center py-4 mb-8 active:opacity-60"
              >
                <Text style={{ color: 'rgba(248,113,113,0.75)' }} className="font-medium text-[13px]">Log out</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- CUSTOM FLOATING TOAST NOTIFICATION --- */}
      {toastVisible && (
        <Animated.View
          entering={SlideInUp.duration(200)}
          exiting={SlideOutDown.duration(150)}
          style={{ zIndex: 100, position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: '#4f46e5' }}
          className="px-4 py-3.5 rounded-xl flex-row items-center justify-center"
        >
          <Text className="text-white font-medium text-[13px] text-center">{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}
