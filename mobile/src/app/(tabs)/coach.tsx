import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { ScrollView as RNScrollView, KeyboardAvoidingView, Platform, StyleSheet, Modal, Image, Alert } from 'react-native';
import { Send, Sparkles, Plus, MoreHorizontal, X, FileText, Image as ImageIcon, Camera, Trash2, Info, Share } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore } from '@/store/useAppStore';

type Attachment = { id: string; type: 'image' | 'file'; uri: string; name: string };
type Message = { id: number; text: string; sender: 'ai' | 'user'; attachments?: Attachment[] };

const SUGGESTED_PROMPTS = [
  "Check my muscle fatigue",
  "Suggest active recovery",
  "Optimize my leg day",
  "Explain 1RM calculation",
  "Best post-workout meal?",
];

const getAIReply = (prompt: string, userName: string, prefUnit: string): string => {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("recovery")) {
    return `Your hamstrings are still at **~60% recovery** from yesterday. I'd skip heavy squats today — a 15-min dynamic stretch session will do more for you than grinding fatigued tissue. \n\nWant me to generate a stretching routine?`;
  }
  
  if (lower.includes("leg day")) {
    return `Hey ${userName}, for today's session:\n\n1. **Romanian Deadlifts:** Lead while your posterior chain is warm.\n2. **Leg Press:** 3 sets of 10-12.\n3. **Walking Lunges:** Until failure.\n\nSkip box squats — save that for Thursday when you're fully recovered.`;
  }
  
  if (lower.includes("1rm")) {
    const exampleWeight = prefUnit === 'lbs' ? 185 : 85;
    const estimated1RM = prefUnit === 'lbs' ? 210 : 96;
    return `Your 1RM is estimated using **Epley's Formula**:\n\n\`\`\`\n1RM = Weight × (1 + Reps ÷ 30)\n\`\`\`\n\nBased on your last logged set of **${exampleWeight} ${prefUnit} × 5 reps**, your estimated squat 1RM is around **${estimated1RM} ${prefUnit}**.`;
  }
  
  if (lower.includes("fatigue")) {
    return `Here is your current muscle fatigue breakdown:\n\n| Muscle Group | Status | Recovery |\n| :--- | :--- | :--- |\n| Chest/Shoulders | ✅ Ready | 100% |\n| Back | 🟡 Good | 85% |\n| Legs | 🔴 Fatigued | 60% |\n\n**Recommendation:** push or pull day today.`;
  }
  
  if (lower.includes("meal")) {
    return `Post-workout window is **30–60 min**. Aim for:\n- 30–40g protein\n- 60–80g fast carbs\n\nThink: chicken + white rice, Greek yogurt + fruit, or a protein shake + banana. Keep fat low right after.`;
  }

  if (!prompt.trim()) {
    return `I received your attachment! Since I'm currently running in mock mode, I can't see the file just yet, but your UI is completely ready for a real Vision/Document LLM API!`;
  }

  return `I'm analyzing your profile, ${userName}... Based on your recent sessions logged in ${prefUnit}, I'd focus on consistency over intensity this week. Want me to build you a tailored plan?`;
};

export default function CoachScreen() {
  const { profile } = useAppStore();
  const { name, unit } = profile;
  const userName = name.split(' ')[0] || 'Athlete';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const scrollRef = useRef<any>(null);

  const markdownRules = {
    fence: (node: any, children: any, parent: any, styles: any) => (
      <RNScrollView horizontal showsHorizontalScrollIndicator={false} key={node.key} style={{ marginTop: 8, marginBottom: 8, borderRadius: 8, backgroundColor: '#262626' }}>
        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#a78bfa', padding: 12, fontSize: 14 }}>
          {node.content}
        </Text>
      </RNScrollView>
    ),
    table: (node: any, children: any, parent: any, styles: any) => (
      <RNScrollView horizontal showsHorizontalScrollIndicator={false} key={node.key} style={{ marginTop: 12, marginBottom: 12 }}>
        <View style={[styles.table, { marginTop: 0, marginBottom: 0 }]}>
          {children}
        </View>
      </RNScrollView>
    )
  };

  // Initialize greeting dynamically based on profile
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: 'ai',
          text: `Hey ${userName}! I saw you hit a new PR on squats yesterday 🎉 How are your legs feeling today?`,
        }
      ]);
    }
  }, [userName]);

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: `Hey ${userName}! I've cleared our chat history. What should we focus on next?`,
      }
    ]);
    setShowOptionsMenu(false);
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const handleAttachmentPress = () => {
    setShowAttachmentMenu(true);
  };

  const handleAttachmentSelection = async (index: number) => {
    setShowAttachmentMenu(false);
    // Add a tiny delay to allow modal to close before opening picker
    setTimeout(async () => {
      try {
        if (index === 0) {
          // Camera
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (permissionResult.granted === false) {
            Alert.alert('Permission needed', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            quality: 0.8,
            base64: true,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setPendingAttachments(prev => [...prev, {
              id: Date.now().toString(),
              type: 'image',
              uri: `data:image/jpeg;base64,${asset.base64}`,
              name: asset.fileName || 'photo.jpg'
            }]);
          }
        } else if (index === 1) {
          // Library
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
            base64: true,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setPendingAttachments(prev => [...prev, {
              id: Date.now().toString(),
              type: 'image',
              uri: `data:image/jpeg;base64,${asset.base64}`,
              name: asset.fileName || 'photo.jpg'
            }]);
          }
        } else if (index === 2) {
          // Document
          const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
          });
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setPendingAttachments(prev => [...prev, {
              id: Date.now().toString(),
              type: 'file',
              uri: asset.uri,
              name: asset.name
            }]);
          }
        }
      } catch (e) {
        console.log("Picker error", e);
      }
    }, 100);
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== id));
  };

  const sendMessage = (text = input) => {
    if (!text.trim() && pendingAttachments.length === 0) return;

    const currentAttachments = [...pendingAttachments];
    const userMsg: Message = { 
      id: Date.now(), 
      sender: 'user', 
      text: text.trim(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingAttachments([]);
    setIsTyping(true);
    scrollToBottom();

    setTimeout(() => {
      setIsTyping(false);
      let replyText = getAIReply(text, userName, unit);
      if (currentAttachments.length > 0) {
        replyText = `*I see you uploaded an attachment! Since I'm currently running in mock mode, I can't analyze files yet, but your UI is ready to hook up to a real Vision/Document API!*\n\n` + (text.trim() ? replyText : '');
      }
      
      const aiMsg: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: replyText.trim(),
      };
      setMessages(prev => [...prev, aiMsg]);
      scrollToBottom();
    }, 1200);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View className="pt-12 pb-4 px-5 bg-neutral-950 border-b border-neutral-900 flex-row items-center justify-between z-10">
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/30 items-center justify-center">
            <Sparkles size={15} color="#818cf8" />
          </View>
          <View>
            <Text className="text-white font-bold text-base tracking-tight">Coach AI</Text>
            <View className="flex-row items-center gap-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <Text className="text-neutral-500 text-[10px] font-semibold">Context-Aware</Text>
            </View>
          </View>
        </View>
        <Pressable 
          className="w-8 h-8 items-center justify-center active:opacity-60"
          onPress={() => setShowOptionsMenu(true)}
        >
          <MoreHorizontal size={20} color="#52525b" />
        </Pressable>
      </View>

      {/* ── Message List ── */}
      <RNScrollView
        ref={scrollRef}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 16 }}
        className="flex-1"
      >
        {messages.map((msg, idx) => {
          const isAI = msg.sender === 'ai';
          const nextMsg = messages[idx + 1];
          const isLastInGroup = !nextMsg || nextMsg.sender !== msg.sender;

          return (
            <Animated.View
              key={msg.id}
              entering={FadeInUp.duration(280).springify().damping(22).stiffness(160)}
              style={{ paddingHorizontal: 16, marginBottom: isLastInGroup ? 20 : 4 }}
            >
              {isAI ? (
                /* ── AI Message (Markdown) ── */
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '92%' }}>
                  <View style={{ width: 32, marginRight: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {isLastInGroup && (
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: 'rgba(99,102,241,0.12)',
                        borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
                        alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Sparkles size={13} color="#818cf8" />
                      </View>
                    )}
                  </View>
                  <View style={{
                    flex: 1,
                    backgroundColor: '#171717',
                    borderWidth: 1, borderColor: 'rgba(64,64,64,0.5)',
                    borderRadius: 18,
                    borderBottomLeftRadius: isLastInGroup ? 4 : 18,
                    paddingHorizontal: 16, paddingVertical: 12,
                    overflow: 'hidden',
                  }}>
                    <Markdown style={markdownStyles} rules={markdownRules as any}>
                      {msg.text}
                    </Markdown>
                  </View>
                </View>
              ) : (
                /* ── User Message ── */
                <View style={{ alignItems: 'flex-end' }}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginBottom: msg.text ? 8 : 0 }}>
                      {msg.attachments.map(att => (
                        att.type === 'image' ? (
                          <Image key={att.id} source={{ uri: att.uri }} style={{ width: 140, height: 140, borderRadius: 16, backgroundColor: '#262626' }} />
                        ) : (
                          <View key={att.id} style={{ backgroundColor: '#262626', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 220 }}>
                            <FileText size={18} color="#a1a1aa" />
                            <Text className="text-zinc-300 font-medium text-sm flex-1" numberOfLines={1} ellipsizeMode="middle">{att.name}</Text>
                          </View>
                        )
                      ))}
                    </View>
                  )}
                  {msg.text ? (
                    <View style={{
                      maxWidth: '80%',
                      backgroundColor: '#4f46e5',
                      borderRadius: 18,
                      borderBottomRightRadius: isLastInGroup ? 4 : 18,
                      paddingHorizontal: 16, paddingVertical: 12,
                    }}>
                      <Text style={{ color: '#ffffff', fontSize: 15, lineHeight: 24, fontWeight: '400' }}>
                        {msg.text}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '88%' }}>
              <View style={{ width: 32, marginRight: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: 'rgba(99,102,241,0.12)',
                  borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <Sparkles size={13} color="#818cf8" />
                </View>
              </View>
              <View style={{
                backgroundColor: '#171717',
                borderWidth: 1, borderColor: 'rgba(64,64,64,0.5)',
                borderRadius: 18, borderBottomLeftRadius: 4,
                paddingHorizontal: 16, paddingVertical: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#737373' }} />
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </RNScrollView>

      {/* ── Suggested Prompts ── */}
      <View className="bg-neutral-950 border-t border-neutral-900/50">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <Pressable
              key={idx}
              onPress={() => sendMessage(prompt)}
              disabled={isTyping}
              className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full active:bg-neutral-800 self-center"
            >
              <Text className="text-indigo-300 font-semibold text-sm">{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Input Bar ── */}
      <View className="px-4 pt-2 pb-8 bg-neutral-950 border-t border-neutral-900/50">
        
        {/* Pending Attachments Strip */}
        {pendingAttachments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 10 }}>
            {pendingAttachments.map(att => (
              <View key={att.id} style={{ position: 'relative' }}>
                {att.type === 'image' ? (
                  <Image source={{ uri: att.uri }} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#262626' }} />
                ) : (
                  <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#262626', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={24} color="#a1a1aa" />
                  </View>
                )}
                <Pressable
                  onPress={() => removeAttachment(att.id)}
                  style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#3f3f46', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a0a0a' }}
                >
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-end bg-neutral-900 border border-neutral-800 rounded-2xl px-3 py-2 gap-2">
          <Pressable onPress={handleAttachmentPress} className="w-8 h-8 rounded-xl bg-neutral-800 items-center justify-center mb-0.5 active:opacity-70 shrink-0">
            <Plus size={16} color="#71717a" />
          </Pressable>

          <TextInput
            className="flex-1 text-white py-1.5 px-1"
            style={{ fontSize: 15, lineHeight: 22, maxHeight: 120 }}
            placeholder="Message Coach AI..."
            placeholderTextColor="#52525b"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />

          <Pressable
            onPress={() => sendMessage()}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isTyping}
            className={`w-8 h-8 rounded-xl items-center justify-center mb-0.5 shrink-0 ${
              (input.trim() || pendingAttachments.length > 0) && !isTyping ? 'bg-indigo-600 active:bg-indigo-700' : 'bg-neutral-800'
            }`}
          >
            <Send size={14} color={(input.trim() || pendingAttachments.length > 0) && !isTyping ? 'white' : '#52525b'} />
          </Pressable>
        </View>
      </View>

      {/* ── Custom Attachment Menu (Web/Cross-Platform) ── */}
      <Modal 
        visible={showAttachmentMenu} 
        transparent={true} 
        animationType="slide"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setShowAttachmentMenu(false)} />
          <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-2xl p-5 pb-8">
            <View className="w-10 h-1 bg-neutral-700 rounded-full self-center mb-5" />
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-extrabold text-lg">Attach Media</Text>
              <Pressable 
                onPress={() => setShowAttachmentMenu(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 items-center justify-center active:bg-neutral-700"
              >
                <X size={16} color="#a1a1aa" />
              </Pressable>
            </View>

            <View className="gap-3">
              <Pressable 
                className="flex-row items-center bg-neutral-950 border border-neutral-800 p-4 rounded-xl active:bg-neutral-800"
                onPress={() => handleAttachmentSelection(0)}
              >
                <Camera size={20} color="#818cf8" />
                <Text className="text-white font-semibold text-sm ml-3">Take Photo</Text>
              </Pressable>

              <Pressable 
                className="flex-row items-center bg-neutral-950 border border-neutral-800 p-4 rounded-xl active:bg-neutral-800"
                onPress={() => handleAttachmentSelection(1)}
              >
                <ImageIcon size={20} color="#818cf8" />
                <Text className="text-white font-semibold text-sm ml-3">Choose from Library</Text>
              </Pressable>

              <Pressable 
                className="flex-row items-center bg-neutral-950 border border-neutral-800 p-4 rounded-xl active:bg-neutral-800"
                onPress={() => handleAttachmentSelection(2)}
              >
                <FileText size={20} color="#818cf8" />
                <Text className="text-white font-semibold text-sm ml-3">Choose File</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Coach AI Options Menu ── */}
      <Modal 
        visible={showOptionsMenu} 
        transparent={true} 
        animationType="slide"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setShowOptionsMenu(false)} />
          <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-2xl p-5 pb-8">
            <View className="w-10 h-1 bg-neutral-700 rounded-full self-center mb-5" />
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-extrabold text-lg">Chat Options</Text>
              <Pressable 
                onPress={() => setShowOptionsMenu(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 items-center justify-center active:bg-neutral-700"
              >
                <X size={16} color="#a1a1aa" />
              </Pressable>
            </View>

            <View className="gap-3">
              <Pressable 
                className="flex-row items-center bg-neutral-950 border border-neutral-800 p-4 rounded-xl active:bg-neutral-800"
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert('AI Context', `The AI currently knows:\n- Name: ${name}\n- Preferred Units: ${unit}\n- Current Workout Phase: Hypertrophy\n- Recent PRs: 3`);
                }}
              >
                <Info size={20} color="#818cf8" />
                <View className="ml-3">
                  <Text className="text-white font-semibold text-sm">View AI Context</Text>
                  <Text className="text-neutral-500 text-xs mt-0.5">See what Coach AI knows about you</Text>
                </View>
              </Pressable>

              <Pressable 
                className="flex-row items-center bg-neutral-950 border border-neutral-800 p-4 rounded-xl active:bg-neutral-800"
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert('Shared', 'A link to this chat has been copied to your clipboard!');
                }}
              >
                <Share size={20} color="#818cf8" />
                <Text className="text-white font-semibold text-sm ml-3">Share Conversation</Text>
              </Pressable>

              <Pressable 
                className="flex-row items-center bg-red-500/10 border border-red-500/20 p-4 rounded-xl active:bg-red-500/20 mt-2"
                onPress={() => {
                  Alert.alert(
                    'Clear Chat',
                    'Are you sure you want to delete this conversation? This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: clearChat }
                    ]
                  );
                }}
              >
                <Trash2 size={20} color="#ef4444" />
                <Text className="text-red-400 font-semibold text-sm ml-3">Clear Chat History</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    color: '#f5f5f5',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  strong: {
    fontWeight: '700',
    color: '#ffffff',
  },
  em: {
    fontStyle: 'italic',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  list_item: {
    marginTop: 2,
    marginBottom: 2,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  th: {
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: '#262626',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  td: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  code_inline: {
    backgroundColor: '#262626',
    color: '#a78bfa',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
} as any);
