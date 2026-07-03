import React from 'react';
import { View } from 'react-native';
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
        tabBarActiveTintColor: '#818cf8', // Indigo-400 — single accent
        tabBarInactiveTintColor: '#52525b', // Zinc-600 — muted inactive
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#171717', // hairline, matches screen headers
          backgroundColor: '#09090b', // screen background
          height: 60,
          paddingTop: 10,
        },
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
