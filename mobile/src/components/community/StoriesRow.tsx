import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from '@/tw';
import { Modal, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X, Plus } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOCK_STORIES = [
  { id: 'my', user: 'You', avatar: null, isMe: true, hasStory: false },
  {
    id: 's1', user: 'Alex Chen', avatar: 'AC',
    storyImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
    hasStory: true,
  },
  {
    id: 's2', user: 'Sarah M.', avatar: 'SM',
    storyImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop',
    hasStory: true,
  },
  {
    id: 's3', user: 'David Kim', avatar: 'DK',
    storyImage: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?q=80&w=800&auto=format&fit=crop',
    hasStory: true,
  },
  {
    id: 's4', user: 'Mike R.', avatar: 'MR',
    storyImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop',
    hasStory: true,
  },
  {
    id: 's5', user: 'Priya S.', avatar: 'PS',
    storyImage: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=800&auto=format&fit=crop',
    hasStory: true,
  },
];

type Story = typeof MOCK_STORIES[number];

export default function StoriesRow({ myAvatar, onCreateStory }: { myAvatar: string | null; onCreateStory: () => void }) {
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [progress, setProgress] = useState(0);

  const openStory = (story: Story) => {
    if (story.isMe || !story.hasStory) {
      if (story.isMe) onCreateStory();
      return;
    }
    setActiveStory(story);
    setProgress(0);
    // Auto-close after 4s
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setActiveStory(null);
          return 0;
        }
        return p + 2.5;
      });
    }, 100);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="py-3 px-4 border-b border-neutral-900/50"
        contentContainerStyle={{ gap: 12 }}
      >
        {MOCK_STORIES.map((story) => {
          const isMe = story.isMe;
          return (
            <Pressable
              key={story.id}
              onPress={() => openStory(story)}
              className="items-center"
              style={{ width: 64 }}
            >
              {/* Ring */}
              <View className={`w-16 h-16 rounded-full items-center justify-center p-0.5 mb-1.5 ${
                isMe ? 'bg-neutral-800' : story.hasStory ? 'bg-gradient-to-tr from-indigo-500 to-violet-500' : 'bg-neutral-800'
              }`}
                style={!isMe && story.hasStory ? {
                  borderWidth: 2,
                  borderColor: '#6366f1',
                  borderRadius: 9999,
                  padding: 2,
                } : { borderWidth: 2, borderColor: '#27272a', borderRadius: 9999, padding: 2 }}
              >
                <View className="w-full h-full rounded-full overflow-hidden bg-neutral-900 items-center justify-center">
                  {isMe ? (
                    myAvatar ? (
                      <Image source={{ uri: myAvatar }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-full bg-neutral-800 items-center justify-center">
                        <Text className="text-neutral-400 text-lg font-black">+</Text>
                      </View>
                    )
                  ) : (
                    <View className="w-full h-full bg-indigo-500/20 items-center justify-center">
                      <Text className="text-indigo-300 font-bold text-sm">{story.avatar}</Text>
                    </View>
                  )}
                </View>
                {isMe && (
                  <View className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-600 rounded-full items-center justify-center border-2 border-neutral-950">
                    <Plus size={10} color="white" />
                  </View>
                )}
              </View>
              <Text className="text-neutral-400 text-[10px] font-semibold text-center" numberOfLines={1}>
                {story.user}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Full-Screen Story Viewer */}
      <Modal visible={!!activeStory} transparent animationType="fade" onRequestClose={() => setActiveStory(null)}>
        <View className="flex-1 bg-black">
          {activeStory && (
            <>
              {/* Progress bar */}
              <View className="absolute top-12 left-4 right-4 z-20 flex-row gap-1">
                <View className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <Animated.View
                    entering={FadeIn}
                    className="h-full bg-white rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </View>

              {/* Header */}
              <View className="absolute top-16 left-4 right-4 z-20 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/40 items-center justify-center">
                    <Text className="text-indigo-300 font-bold text-xs">{activeStory.avatar}</Text>
                  </View>
                  <View>
                    <Text className="text-white font-bold text-sm">{activeStory.user}</Text>
                    <Text className="text-white/60 text-[10px]">Just now</Text>
                  </View>
                </View>
                <Pressable onPress={() => setActiveStory(null)} className="p-1">
                  <X size={24} color="white" />
                </Pressable>
              </View>

              {/* Story Image */}
              {'storyImage' in activeStory && activeStory.storyImage && (
                <Image
                  source={{ uri: activeStory.storyImage as string }}
                  className="flex-1"
                  resizeMode="cover"
                />
              )}

              {/* Workout Tag overlay */}
              <View className="absolute bottom-20 left-4 right-4 z-20">
                <View className="bg-black/50 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
                  <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">Crushed today</Text>
                  <Text className="text-white font-extrabold text-base">Leg Day Annihilation</Text>
                  <Text className="text-indigo-300 text-xs font-semibold">15.2k lbs · 2 PRs</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}
