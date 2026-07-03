import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from '@/tw';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSlideIn } from '@/lib/useSlideIn';
import { Plus, Search, Users } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StoriesRow from '@/components/community/StoriesRow';
import PostCard from '@/components/community/PostCard';
import CreatePostModal from '@/components/community/CreatePostModal';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slide = useSlideIn();
  const { profile, feed, addFeedPost } = useAppStore();
  const { name, avatarImage } = profile;
  const [createVisible, setCreateVisible] = useState(false);

  const getInitials = (n: string) => {
    const p = n.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase();
  };

  const handleNewPost = (post: any) => {
    addFeedPost(post);
  };

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: '#09090b' }, slide]}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 20 }} className="pb-3 px-5 bg-[#09090b] border-b border-neutral-900 z-10 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-white tracking-tight">Community</Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.push('/search')} className="w-9 h-9 bg-neutral-900 border border-neutral-800 rounded-full items-center justify-center active:opacity-70">
            <Search size={16} color="#a1a1aa" />
          </Pressable>
          <Pressable
            onPress={() => setCreateVisible(true)}
            className="w-9 h-9 bg-indigo-600 rounded-full items-center justify-center active:opacity-80"
          >
            <Plus size={18} color="white" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Stories Row */}
        <StoriesRow myAvatar={avatarImage || null} onCreateStory={() => setCreateVisible(true)} />

        {/* Quick post bar */}
        <Pressable
          onPress={() => setCreateVisible(true)}
          className="flex-row items-center px-5 py-3 border-b border-neutral-900/40 bg-[#09090b] active:bg-neutral-900/30"
        >
          <View className="w-9 h-9 rounded-full overflow-hidden border border-indigo-500/30 bg-indigo-500/20 items-center justify-center mr-3">
            {avatarImage
              ? <Image source={{ uri: avatarImage }} className="w-full h-full" resizeMode="cover" />
              : <Text className="text-indigo-300 font-bold text-xs">{getInitials(name)}</Text>
            }
          </View>
          <View className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2.5">
            <Text className="text-neutral-500 text-xs font-semibold">Share your workout...</Text>
          </View>
        </Pressable>

        {/* Post Feed */}
        <View className="px-3 pt-4 pb-24">
          {feed.length === 0 ? (
            <View className="items-center py-20 px-8">
              <Users size={28} color="#3f3f46" />
              <Text className="text-neutral-400 text-[15px] mt-3">No posts yet</Text>
              <Text className="text-neutral-600 text-[13px] mt-1 text-center">Share a workout to start your feed</Text>
            </View>
          ) : (
            feed.map((post, idx) => (
              <Animated.View
                key={post.id}
                entering={FadeInDown.delay(idx * 60).duration(400).springify().damping(14)}
              >
                <PostCard post={post} />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onPost={handleNewPost}
      />
    </Animated.View>
  );
}
