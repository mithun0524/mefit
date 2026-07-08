import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Home, Dumbbell, User, MessageCircle, Users } from 'lucide-react-native';
import { useUI } from '@/lib/ui';
import SettingsPanel from '@/components/SettingsPanel';

export default function TabLayout() {
  const { settingsOpen, closeSettings } = useUI();
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift', // both screens render during the switch (direction-aware)
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#a5b4fc', // Indigo-300 — single accent
        tabBarInactiveTintColor: '#5b5b63', // muted inactive
        // Frosted glass bar — content scrolls beneath it (iOS material).
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(255,255,255,0.09)',
          backgroundColor: 'transparent',
          elevation: 0,
          height: 62,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(9,9,11,0.55)' }]} />
          </View>
        ),
        sceneStyle: { backgroundColor: '#09090b' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={2} />,
        }}
      />
    </Tabs>
    {settingsOpen && <SettingsPanel onClose={closeSettings} />}
    </View>
  );
}
