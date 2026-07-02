import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Dumbbell, User, MessageCircle, Users } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#818cf8', // Indigo-400
        tabBarInactiveTintColor: '#52525b', // Zinc-600
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#27272a', // Zinc-800
          backgroundColor: '#09090b', // Zinc-950
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
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={2.5} />,
        }}
      />
    </Tabs>
  );
}
