import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Image, ScrollView } from '@/tw';
import { Alert, Share, Dimensions, ScrollView as RNScrollView } from 'react-native';
import {
  Heart, MessageCircle, Share2, Bookmark,
  Award, Copy, ChevronLeft, ChevronRight, Dumbbell, MoreHorizontal
} from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
  withTiming, withDelay,
} from 'react-native-reanimated';
import CommentSheet, { Comment } from './CommentSheet';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { FeedPost } from '@/store/useAppStore';

export default function PostCard({ post }: { post: FeedPost }) {
  const router = useRouter();

  // Engagement state
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [savesCount, setSavesCount] = useState(post.saves);
  const [commentsVisible, setCommentsVisible] = useState(false);

  // Carousel
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<any>(null);

  // Double-tap
  const lastTap = useRef(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  // Like bounce animation
  const likeScale = useSharedValue(1);
  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));

  // Bookmark bounce
  const saveScale = useSharedValue(1);
  const saveStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));

  const handleLike = () => {
    likeScale.value = withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, { damping: 8 }));
    setLiked(l => !l);
    setLikesCount(c => liked ? c - 1 : c + 1);
  };

  const handleSave = () => {
    saveScale.value = withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, { damping: 8 }));
    setSaved(s => !s);
    setSavesCount(c => saved ? c - 1 : c + 1);
  };

  const handleShare = async () => {
    await Share.share({
      message: `${post.user}: ${post.caption}${post.workout ? `\nWorkout: ${post.workout}` : ''}`,
    });
  };

  const handleMorePress = () => {
    Alert.alert(post.user, 'Choose an action', [
      { text: 'View profile', onPress: () => router.push(`/user/${post.userId}`) },
      { text: 'Share post', onPress: handleShare },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) {
        setLiked(true);
        setLikesCount(c => c + 1);
      }
      heartScale.value = 0;
      heartScale.value = withSequence(
        withSpring(1.6, { damping: 5 }),
        withDelay(160, withTiming(0, { duration: 160 }))
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(300, withTiming(0, { duration: 160 }))
      );
    }
    lastTap.current = now;
  };

  const isTextPost = post.images.length === 0;
  const isCarousel = post.images.length > 1;

  return (
    <View className="bg-neutral-900 border border-neutral-800/70 rounded-2xl mb-4 overflow-hidden">

      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.push(`/user/${post.userId}`)}
          className="w-10 h-10 rounded-full overflow-hidden border border-indigo-500/30 bg-indigo-500/20 items-center justify-center mr-3 active:opacity-70"
        >
          {post.avatarImage
            ? <Image source={{ uri: post.avatarImage }} className="w-full h-full" resizeMode="cover" />
            : <Text className="text-indigo-300 font-bold text-sm">{post.avatar}</Text>
          }
        </Pressable>
        <View className="flex-1">
          <Text className="text-white font-bold text-sm">{post.user}</Text>
          <Text className="text-neutral-500 text-[10px] font-semibold">{post.time}</Text>
        </View>
        <Pressable onPress={handleMorePress} className="p-1 active:opacity-70">
          <MoreHorizontal size={20} color="#71717a" />
        </Pressable>
      </View>

      {/* ── Image Area ── */}
      {!isTextPost && (
        <Pressable onPress={handleDoubleTap} className="relative">
          {/* Carousel scroll */}
          <RNScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCarouselIndex(idx);
            }}
            style={{ width: SCREEN_WIDTH - 32 }}
          >
            {post.images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: SCREEN_WIDTH - 32, height: 280 }}
                resizeMode="cover"
              />
            ))}
          </RNScrollView>

          {/* Double-tap heart burst */}
          <Animated.View
            style={[{ position: 'absolute', alignSelf: 'center', top: '30%', zIndex: 20, pointerEvents: 'none' as any }, heartStyle]}
          >
            <Heart size={80} color="#f97316" fill="#f97316" />
          </Animated.View>

          {/* Carousel dots */}
          {isCarousel && (
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5 z-10">
              {post.images.map((_, i) => (
                <View
                  key={i}
                  className={`rounded-full ${i === carouselIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                />
              ))}
            </View>
          )}

          {/* Image count badge */}
          {isCarousel && (
            <View className="absolute top-3 right-3 bg-black/60 rounded-full px-2.5 py-1 z-10">
              <Text className="text-white font-bold text-xs">{carouselIndex + 1}/{post.images.length}</Text>
            </View>
          )}
        </Pressable>
      )}

      {/* ── Action Row ── */}
      <View className="flex-row items-center px-4 pt-3 pb-1 gap-4">
        {/* Like */}
        <Pressable onPress={handleLike} className="flex-row items-center gap-1.5 active:opacity-70">
          <Animated.View style={likeStyle}>
            <Heart size={22} color={liked ? '#f97316' : '#a1a1aa'} fill={liked ? '#f97316' : 'transparent'} />
          </Animated.View>
          <Text className={`text-sm font-bold ${liked ? 'text-orange-400' : 'text-neutral-400'}`}>{likesCount}</Text>
        </Pressable>

        {/* Comment */}
        <Pressable onPress={() => setCommentsVisible(true)} className="flex-row items-center gap-1.5 active:opacity-70">
          <MessageCircle size={22} color="#a1a1aa" />
          <Text className="text-neutral-400 text-sm font-bold">{post.commentCount}</Text>
        </Pressable>

        {/* Share */}
        <Pressable onPress={handleShare} className="flex-row items-center gap-1.5 active:opacity-70">
          <Share2 size={21} color="#a1a1aa" />
        </Pressable>

        {/* Spacer */}
        <View className="flex-1" />

        {/* Save / Bookmark */}
        <Pressable onPress={handleSave} className="active:opacity-70">
          <Animated.View style={saveStyle}>
            <Bookmark size={22} color={saved ? '#818cf8' : '#a1a1aa'} fill={saved ? '#818cf8' : 'transparent'} />
          </Animated.View>
        </Pressable>
      </View>

      {/* ── Saves line ── */}
      {savesCount > 0 && (
        <View className="px-4 pb-1">
          <Text className="text-neutral-500 text-[11px] font-semibold">{savesCount} saves</Text>
        </View>
      )}

      {/* ── Caption ── */}
      <View className="px-4 pb-3">
        <Text className="text-white text-sm leading-relaxed">
          <Text className="font-bold">{post.user} </Text>
          {post.caption}
        </Text>

        {/* Workout tag */}
        {post.workout && (
          <Pressable className="flex-row items-center mt-2 bg-neutral-950 border border-neutral-800/60 self-start px-3 py-1.5 rounded-full gap-1.5 active:opacity-75">
            <Dumbbell size={12} color="#818cf8" />
            <Text className="text-indigo-400 font-bold text-xs">{post.workout}</Text>
            {post.volume && <Text className="text-neutral-500 text-xs">· {post.volume}</Text>}
            {post.prs ? <Award size={12} color="#fb923c" /> : null}
          </Pressable>
        )}

        {/* View all comments */}
        {post.commentCount > 0 && (
          <Pressable onPress={() => setCommentsVisible(true)} className="mt-2 active:opacity-70">
            <Text className="text-neutral-500 text-xs font-semibold">View all {post.commentCount} comments</Text>
          </Pressable>
        )}
      </View>

      {/* ── Comment Sheet ── */}
      <CommentSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        postId={post.id}
        initialComments={post.initialComments}
      />
    </View>
  );
}
