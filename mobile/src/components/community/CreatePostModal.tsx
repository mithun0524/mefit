import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from '@/tw';
import { TextInput, Modal, Dimensions } from 'react-native';
import { X, Dumbbell, Globe, Lock, ChevronDown, Images, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore, FeedPost } from '@/store/useAppStore';
import { Comment } from './CommentSheet';

const SCREEN_WIDTH = Dimensions.get('window').width;

const WORKOUT_OPTIONS = [
  'Upper Body Power',
  'Leg Day Annihilation',
  'Push Hypertrophy',
  'Pull Day',
  'Core & Conditioning',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onPost: (post: FeedPost) => void;
};

export default function CreatePostModal({ visible, onClose, onPost }: Props) {
  const { profile } = useAppStore();
  const { name, avatarImage } = profile;

  const [caption, setCaption] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);

  const getInitials = (n: string) => {
    const p = n.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.substring(0, 2).toUpperCase();
  };

  // ── Pick from device gallery ──
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => `data:image/jpeg;base64,${a.base64}`);
      setSelectedImages(prev => [...prev, ...uris].slice(0, 5));
    }
  };

  const removeImage = (idx: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePost = () => {
    if (!caption.trim() && selectedImages.length === 0) return;

    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      userId: 'me',
      user: name,
      avatar: getInitials(name),
      avatarImage: avatarImage || null,
      time: 'Just now',
      images: selectedImages,
      caption: caption.trim(),
      workout: selectedWorkout || undefined,
      volume: undefined,
      prs: 0,
      likes: 0,
      saves: 0,
      commentCount: 0,
      initialComments: [] as Comment[],
    };

    onPost(newPost);
    setCaption('');
    setSelectedImages([]);
    setSelectedWorkout('');
    setIsPublic(true);
    setShowWorkoutPicker(false);
    onClose();
  };

  const canPost = caption.trim().length > 0 || selectedImages.length > 0;

  const GRID_CELL = (SCREEN_WIDTH - 4) / 3;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[#09090b]">

        {/* ── Top Bar ── */}
        <View className="pt-12 pb-3 px-5 flex-row justify-between items-center border-b border-neutral-900">
          <Pressable onPress={onClose} className="p-1 active:opacity-60">
            <X size={22} color="#a1a1aa" />
          </Pressable>
          <Text className="text-white font-bold text-base">New post</Text>
          <Pressable
            onPress={handlePost}
            disabled={!canPost}
            className={`px-5 py-2 rounded-full ${canPost ? 'bg-indigo-600 active:opacity-80' : 'bg-neutral-800'}`}
          >
            <Text className={`font-semibold text-sm ${canPost ? 'text-white' : 'text-neutral-600'}`}>Share</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="flex-1">

          {/* ── Preview area ── */}
          {selectedImages.length > 0 ? (
            /* Selected images preview */
            <View>
              {/* Main preview */}
              <View className="relative bg-black" style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}>
                <Image
                  source={{ uri: selectedImages[0] }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="cover"
                />
                {selectedImages.length > 1 && (
                  <View className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1">
                    <Text className="text-white font-bold text-xs">{selectedImages.length} photos</Text>
                  </View>
                )}
              </View>

              {/* Thumbnail strip + add more */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-neutral-950 py-2 px-2" contentContainerStyle={{ gap: 4 }}>
                {selectedImages.map((uri, i) => (
                  <Pressable key={i} onPress={() => removeImage(i)} className="relative">
                    <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 6 }} resizeMode="cover" />
                    {/* Remove X */}
                    <View className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-950 rounded-full items-center justify-center border border-neutral-700">
                      <X size={10} color="#a1a1aa" />
                    </View>
                    {i === 0 && (
                      <View className="absolute bottom-1 left-1 bg-black/70 rounded px-1">
                        <Text className="text-white text-[9px] font-semibold">Cover</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
                {selectedImages.length < 5 && (
                  <Pressable
                    onPress={pickImages}
                    style={{ width: 72, height: 72, borderRadius: 6 }}
                    className="bg-neutral-900 border border-dashed border-neutral-700 items-center justify-center active:bg-neutral-800"
                  >
                    <Images size={20} color="#52525b" />
                  </Pressable>
                )}
              </ScrollView>
            </View>
          ) : (
            /* ── Empty state: pick source ── */
            <View>
              {/* Big pick buttons — ABOVE THE FOLD, first thing you see */}
              <View className="flex-row border-b border-neutral-900">
                {/* From Device */}
                <Pressable
                  onPress={pickImages}
                  className="flex-1 py-8 items-center justify-center gap-3 border-r border-neutral-900 active:bg-neutral-900"
                >
                  <View className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center">
                    <Images size={28} color="#818cf8" />
                  </View>
                  <View className="items-center">
                    <Text className="text-white font-bold text-sm">From device</Text>
                    <Text className="text-neutral-500 text-xs mt-0.5">Pick up to 5 photos</Text>
                  </View>
                </Pressable>

                {/* Text only */}
                <Pressable
                  onPress={() => {/* just proceed to caption below */}}
                  className="flex-1 py-8 items-center justify-center gap-3 active:bg-neutral-900"
                >
                  <View className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 items-center justify-center">
                    <Text className="text-neutral-300 font-bold text-xl">Aa</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-white font-bold text-sm">Text only</Text>
                    <Text className="text-neutral-500 text-xs mt-0.5">No image</Text>
                  </View>
                </Pressable>
              </View>

            </View>
          )}

          {/* ── Caption row ── */}
          <View className="flex-row items-start px-4 py-4 border-t border-b border-neutral-900 gap-3">
            <View className="w-9 h-9 rounded-full overflow-hidden border border-indigo-500/30 bg-indigo-500/20 items-center justify-center shrink-0">
              {avatarImage
                ? <Image source={{ uri: avatarImage }} className="w-full h-full" resizeMode="cover" />
                : <Text className="text-indigo-300 font-bold text-xs">{getInitials(name)}</Text>
              }
            </View>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption..."
              placeholderTextColor="#52525b"
              multiline
              className="flex-1 text-white"
              style={{ fontSize: 15, minHeight: 56, lineHeight: 22 }}
            />
          </View>

          {/* ── Tag workout ── */}
          <Pressable
            onPress={() => setShowWorkoutPicker(!showWorkoutPicker)}
            className="flex-row items-center px-5 py-4 border-b border-neutral-900 active:bg-neutral-900/50"
          >
            <Dumbbell size={18} color="#818cf8" />
            <Text className="flex-1 text-white font-semibold text-sm ml-3">
              {selectedWorkout || <Text className="text-neutral-500">Tag a workout</Text>}
            </Text>
            <ChevronDown size={16} color="#52525b" />
          </Pressable>

          {showWorkoutPicker && (
            <View className="bg-neutral-950 border-b border-neutral-900">
              {WORKOUT_OPTIONS.map((wo) => (
                <Pressable
                  key={wo}
                  onPress={() => { setSelectedWorkout(wo); setShowWorkoutPicker(false); }}
                  className={`flex-row items-center px-5 py-3.5 border-b border-neutral-800/40 active:bg-neutral-900 ${selectedWorkout === wo ? 'bg-indigo-500/10' : ''}`}
                >
                  <Text className={`font-semibold text-sm ${selectedWorkout === wo ? 'text-indigo-400' : 'text-neutral-300'}`}>{wo}</Text>
                  {selectedWorkout === wo && <View className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />}
                </Pressable>
              ))}
            </View>
          )}

          {/* ── Audience ── */}
          <Pressable
            onPress={() => setIsPublic(!isPublic)}
            className="flex-row items-center px-5 py-4 border-b border-neutral-900 active:bg-neutral-900/50"
          >
            {isPublic ? <Globe size={18} color="#818cf8" /> : <Lock size={18} color="#818cf8" />}
            <Text className="flex-1 text-white font-semibold text-sm ml-3">
              {isPublic ? 'Public' : 'Followers Only'}
            </Text>
            <View className={`w-11 h-6 rounded-full px-0.5 justify-center ${isPublic ? 'bg-indigo-600' : 'bg-neutral-700'}`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${isPublic ? 'self-end' : 'self-start'}`} />
            </View>
          </Pressable>

          <View className="h-12" />
        </ScrollView>
      </View>
    </Modal>
  );
}
