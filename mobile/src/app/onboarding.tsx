import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { ScrollView as RNScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Bot, Sparkles, Goal, Dumbbell, Zap } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppStore } from '@/store/useAppStore';

// ---- Offline AI Conversation Script ----
const ONBOARDING_SCRIPT = [
  {
    question: "Hi! I'm your AI Coach. What's your main fitness goal?",
    quickReplies: ['Build muscle', 'Lose weight', 'Improve endurance', 'Get stronger'],
    key: 'goal',
  },
  {
    question: "Nice! How many days per week can you train?",
    quickReplies: ['2-3 days', '4-5 days', '6-7 days', 'Just weekends'],
    key: 'frequency',
  },
  {
    question: "What equipment do you have access to?",
    quickReplies: ['Full gym', 'Home with dumbbells', 'Bodyweight only', 'Resistance bands'],
    key: 'equipment',
  },
  {
    question: "What's your current experience level?",
    quickReplies: ['Beginner', 'Intermediate', 'Advanced', 'Returning after a break'],
    key: 'level',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const answers = useRef<Record<string, string>>({});
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const currentStep = ONBOARDING_SCRIPT[stepIndex];

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;

    answers.current[currentStep.key] = text.trim();

    const newHistory = [
      ...history,
      { role: 'assistant', content: currentStep.question },
      { role: 'user', content: text },
    ];

    setHistory(newHistory);
    setInput('');
    setLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);

    // Simulate AI "thinking" then advance to next question
    setTimeout(() => {
      setLoading(false);
      const nextIndex = stepIndex + 1;
      if (nextIndex >= ONBOARDING_SCRIPT.length) {
        setDone(true);
      } else {
        setStepIndex(nextIndex);
      }
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    }, 800);
  };

  const handleFinish = () => {
    const a = answers.current;
    updateProfile({
      goal: a.goal,
      trainingDays: a.frequency,
      equipment: a.equipment,
      experience: a.level,
    });
    setAuthenticated(true);
    router.replace('/');
  };

  return (
    <View style={{ backgroundColor: '#09090b' }} className="flex-1">
      {/* Header */}
      <View style={{ backgroundColor: '#09090b', paddingTop: insets.top + 20 }} className="pb-4 px-6 border-b border-neutral-900 items-center justify-center z-10">
        <View className="flex-row items-center gap-2">
          <Sparkles size={17} color="#818cf8" />
          <Text className="text-[17px] font-bold text-white tracking-tight">Personalize your AI coach</Text>
        </View>
        <Text className="text-neutral-500 text-[12px] mt-1">Step {Math.min(stepIndex + 1, ONBOARDING_SCRIPT.length)} of {ONBOARDING_SCRIPT.length}</Text>

        {/* Progress bar */}
        <View className="w-full mt-3 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${((Math.min(stepIndex + 1, ONBOARDING_SCRIPT.length)) / ONBOARDING_SCRIPT.length) * 100}%`, backgroundColor: '#4f46e5' }}
          />
        </View>
      </View>

      <RNScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Past messages */}
        {history.map((msg, idx) => (
          <Animated.View key={idx} entering={FadeInDown.duration(300)}>
            {msg.role === 'assistant' && (
              <View className="flex-row items-start mb-4 max-w-[85%]">
                <View className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/30 items-center justify-center mr-3 shrink-0">
                  <Bot size={16} color="#818cf8" />
                </View>
                <View style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }} className="border p-4 rounded-2xl rounded-tl-sm">
                  <Text className="text-neutral-200 text-[15px] leading-6">{msg.content}</Text>
                </View>
              </View>
            )}
            {msg.role === 'user' && (
              <View className="flex-row items-end justify-end mb-4 max-w-[85%] self-end">
                <View style={{ backgroundColor: '#4f46e5' }} className="p-4 rounded-2xl rounded-tr-sm">
                  <Text className="text-white text-[15px] leading-6">{msg.content}</Text>
                </View>
              </View>
            )}
          </Animated.View>
        ))}

        {/* Current Question or Final Card */}
        {!done ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View className="flex-row items-start mb-6 max-w-[85%]">
              <View className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/30 items-center justify-center mr-3 shrink-0">
                <Bot size={16} color="#818cf8" />
              </View>
              <View style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }} className="border p-4 rounded-2xl rounded-tl-sm">
                <Text className="text-neutral-200 text-[15px] leading-6">{currentStep.question}</Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)} className="items-center py-8">
            <View className="w-16 h-16 bg-indigo-500/10 rounded-full items-center justify-center border border-indigo-500/30 mb-4">
              <Zap size={28} color="#818cf8" />
            </View>
            <Text className="text-white font-bold text-2xl mb-2 tracking-tight">You're all set!</Text>
            <Text className="text-neutral-400 text-[15px] text-center leading-relaxed mb-6 px-4">
              I've built your personalized AI training plan. Let's get to work.
            </Text>
            <Pressable
              onPress={handleFinish}
              style={{ backgroundColor: '#4f46e5' }}
              className="px-10 py-3.5 rounded-2xl items-center justify-center active:opacity-85"
            >
              <Text className="text-white font-semibold text-[15px]">Let's go</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Loading dots */}
        {loading && (
          <View className="flex-row items-start mb-4 mt-[-8px]">
            <View className="w-9 h-9 mr-3 shrink-0" />
            <View style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }} className="border px-4 py-3 rounded-2xl">
              <Text className="text-neutral-500 text-[15px]">● ● ●</Text>
            </View>
          </View>
        )}
      </RNScrollView>

      {/* Input Area */}
      {!done && (
        <View style={{ backgroundColor: '#09090b' }} className="px-4 py-4 border-t border-neutral-900 pb-8">
          {/* Quick reply chips */}
          {currentStep.quickReplies && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {currentStep.quickReplies.map((reply, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSend(reply)}
                  disabled={loading}
                  style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }}
                  className="border px-3.5 py-2 rounded-full mr-2 active:opacity-70"
                >
                  <Text className="text-indigo-300 font-medium text-[13px]">{reply}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={{ backgroundColor: '#1c1c21', borderColor: '#313138' }} className="flex-row items-center border rounded-full pl-4 pr-1.5 py-1.5">
            <TextInput
              className="flex-1 text-[15px] text-white min-h-[40px]"
              placeholder="Or type your answer..."
              placeholderTextColor="#52525b"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend(input)}
              editable={!loading}
            />
            <Pressable
              onPress={() => handleSend(input)}
              disabled={loading || !input.trim()}
              style={{ backgroundColor: input.trim() && !loading ? '#4f46e5' : '#26262c' }}
              className="w-9 h-9 rounded-full items-center justify-center"
            >
              <ChevronRight size={18} color="white" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
