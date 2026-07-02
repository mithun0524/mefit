import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Image, ScrollView } from '@/tw';
import { TextInput, Modal, Dimensions, ScrollView as RNScrollView } from 'react-native';
import { X, Send, Heart, MessageCircle, CornerDownRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type Comment = {
  id: string;
  author: string;
  avatar: string;
  text: string;
  likes: number;
  liked: boolean;
  time: string;
  replies: Comment[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  initialComments: Comment[];
};

function CommentItem({
  comment,
  onReply,
  depth = 0,
}: {
  comment: Comment;
  onReply: (id: string, author: string) => void;
  depth?: number;
}) {
  const [liked, setLiked] = useState(comment.liked);
  const [likes, setLikes] = useState(comment.likes);

  const toggleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <View className={depth > 0 ? 'ml-10' : ''}>
      <View className="flex-row items-start py-3">
        {depth > 0 && (
          <CornerDownRight size={14} color="#52525b" style={{ marginRight: 6, marginTop: 2 }} />
        )}
        <View className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 items-center justify-center mr-3 shrink-0">
          <Text className="text-indigo-300 font-bold text-xs">{comment.avatar}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-0.5">
            <Text className="text-white font-bold text-xs">{comment.author}</Text>
            <Text className="text-neutral-600 text-[10px]">{comment.time}</Text>
          </View>
          <Text className="text-neutral-300 text-sm leading-relaxed">{comment.text}</Text>
          <View className="flex-row items-center gap-4 mt-2">
            <Pressable onPress={toggleLike} className="flex-row items-center gap-1 active:opacity-70">
              <Heart size={13} color={liked ? '#ef4444' : '#71717a'} fill={liked ? '#ef4444' : 'transparent'} />
              <Text className={`text-[11px] font-semibold ${liked ? 'text-red-400' : 'text-neutral-500'}`}>{likes}</Text>
            </Pressable>
            <Pressable onPress={() => onReply(comment.id, comment.author)} className="active:opacity-70">
              <Text className="text-neutral-500 text-[11px] font-semibold">Reply</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {comment.replies.map(reply => (
        <CommentItem key={reply.id} comment={reply} onReply={onReply} depth={depth + 1} />
      ))}
    </View>
  );
}

export default function CommentSheet({ visible, onClose, postId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const scrollRef = useRef<any>(null);

  const handleReply = (commentId: string, author: string) => {
    setReplyingTo({ id: commentId, author });
    setInput(`@${author} `);
  };

  const submitComment = () => {
    if (!input.trim()) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: 'You',
      avatar: 'U',
      text: input.trim(),
      likes: 0,
      liked: false,
      time: 'just now',
      replies: [],
    };

    if (replyingTo) {
      // Thread the reply under the parent comment
      setComments(prev =>
        prev.map(c =>
          c.id === replyingTo.id
            ? { ...c, replies: [...c.replies, newComment] }
            : c
        )
      );
    } else {
      setComments(prev => [...prev, newComment]);
    }

    setInput('');
    setReplyingTo(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-[#1c1c21] border-t border-[#313138] rounded-t-2xl" style={{ height: SCREEN_HEIGHT * 0.7 }}>
          <View className="w-10 h-1 bg-neutral-700 rounded-full self-center mt-4 mb-4" />

          {/* Header */}
          <View className="flex-row justify-between items-center px-5 mb-3">
            <Text className="text-white font-bold text-base">
              Comments {comments.length > 0 && <Text className="text-neutral-500">({comments.length})</Text>}
            </Text>
            <Pressable onPress={onClose} className="w-7 h-7 rounded-full bg-neutral-800 items-center justify-center active:opacity-70">
              <X size={16} color="#a1a1aa" />
            </Pressable>
          </View>

          {/* Comment List */}
          <RNScrollView
            ref={scrollRef}
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
          >
            {comments.length === 0 ? (
              <View className="items-center justify-center py-12">
                <MessageCircle size={36} color="#3f3f46" />
                <Text className="text-neutral-400 font-semibold text-sm mt-3">No comments yet</Text>
                <Text className="text-neutral-500 text-xs mt-1">Be the first to comment</Text>
              </View>
            ) : (
              comments.map(comment => (
                <Animated.View key={comment.id} entering={FadeInDown.duration(250)}>
                  <CommentItem comment={comment} onReply={handleReply} />
                  <View className="h-px bg-neutral-800/50" />
                </Animated.View>
              ))
            )}
            <View className="h-4" />
          </RNScrollView>

          {/* Reply indicator */}
          {replyingTo && (
            <View className="flex-row items-center justify-between bg-indigo-500/10 border-t border-indigo-500/20 px-4 py-2">
              <Text className="text-indigo-400 text-xs font-semibold">Replying to @{replyingTo.author}</Text>
              <Pressable onPress={() => { setReplyingTo(null); setInput(''); }}>
                <X size={14} color="#818cf8" />
              </Pressable>
            </View>
          )}

          {/* Input */}
          <View className="flex-row items-center border-t border-neutral-800/60 px-4 py-3 pb-8 gap-3">
            <View className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 items-center justify-center shrink-0">
              <Text className="text-indigo-300 font-bold text-xs">U</Text>
            </View>
            <View className="flex-1 bg-neutral-950 border border-neutral-800 rounded-full px-4 py-2.5 flex-row items-center">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={replyingTo ? `Reply to @${replyingTo.author}...` : 'Add a comment...'}
                placeholderTextColor="#52525b"
                className="flex-1 text-white text-sm font-semibold"
                style={{ fontSize: 13 }}
              />
            </View>
            <Pressable
              onPress={submitComment}
              disabled={!input.trim()}
              className={`w-9 h-9 rounded-full items-center justify-center ${input.trim() ? 'bg-indigo-600' : 'bg-neutral-800'}`}
            >
              <Send size={15} color="white" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
