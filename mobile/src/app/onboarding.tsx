import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { ScrollView as RNScrollView } from 'react-native';
import { useRouter } from 'expo-router';
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
  const setAuthenticated = useAppStore((state) => state.setAuthenticated);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const currentStep = ONBOARDING_SCRIPT[stepIndex];

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;

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
    setAuthenticated(true);
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Header */}
      <View className="pt-14 pb-4 px-6 bg-neutral-950 border-b border-neutral-900 items-center justify-center z-10">
        <View className="flex-row items-center gap-2">
          <Sparkles size={18} color="#818cf8" />
          <Text className="text-lg font-extrabold text-white tracking-tight">Personalize Your AI Coach</Text>
        </View>
        <Text className="text-neutral-500 text-xs font-semibold mt-1">Step {Math.min(stepIndex + 1, ONBOARDING_SCRIPT.length)} of {ONBOARDING_SCRIPT.length}</Text>

        {/* Progress bar */}
        <View className="w-full mt-3 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <View
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${((Math.min(stepIndex + 1, ONBOARDING_SCRIPT.length)) / ONBOARDING_SCRIPT.length) * 100}%` }}
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
                <View className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl rounded-tl-sm">
                  <Text className="text-neutral-200 text-sm leading-6 font-semibold">{msg.content}</Text>
                </View>
              </View>
            )}
            {msg.role === 'user' && (
              <View className="flex-row items-end justify-end mb-4 max-w-[85%] self-end">
                <View className="bg-indigo-600 p-4 rounded-2xl rounded-tr-sm">
                  <Text className="text-white text-sm leading-6 font-semibold">{msg.content}</Text>
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
              <View className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl rounded-tl-sm">
                <Text className="text-neutral-200 text-sm leading-6 font-semibold">{currentStep.question}</Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)} className="items-center py-8">
            <View className="w-16 h-16 bg-indigo-500/10 rounded-full items-center justify-center border border-indigo-500/30 mb-4">
              <Zap size={28} color="#818cf8" />
            </View>
            <Text className="text-white font-extrabold text-xl mb-2 tracking-tight">You're all set!</Text>
            <Text className="text-neutral-400 text-sm font-semibold text-center leading-relaxed mb-6 px-4">
              I've built your personalized AI training plan. Let's get to work.
            </Text>
            <Pressable
              onPress={handleFinish}
              className="bg-indigo-600 px-8 py-3.5 rounded-full items-center justify-center active:bg-indigo-700 shadow-[0_4px_15px_rgba(79,70,229,0.4)]"
            >
              <Text className="text-white font-extrabold text-sm uppercase tracking-wider">Let's Go →</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Loading dots */}
        {loading && (
          <View className="flex-row items-start mb-4 mt-[-8px]">
            <View className="w-9 h-9 mr-3 shrink-0" />
            <View className="bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-2xl">
              <Text className="text-neutral-400 tracking-widest text-sm">● ● ●</Text>
            </View>
          </View>
        )}
      </RNScrollView>

      {/* Input Area */}
      {!done && (
        <View className="px-4 py-4 bg-neutral-950 border-t border-neutral-900/60 pb-8">
          {/* Quick reply chips */}
          {currentStep.quickReplies && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {currentStep.quickReplies.map((reply, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSend(reply)}
                  disabled={loading}
                  className="bg-neutral-900 border border-neutral-800 px-3.5 py-2 rounded-full mr-2 active:bg-neutral-800"
                >
                  <Text className="text-indigo-300 font-bold text-xs">{reply}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View className="flex-row items-center bg-neutral-900 border border-neutral-800 rounded-full pl-4 pr-1.5 py-1.5">
            <TextInput
              className="flex-1 text-sm text-white font-semibold min-h-[40px]"
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
              className={`w-9 h-9 rounded-full items-center justify-center ${input.trim() && !loading ? 'bg-indigo-600' : 'bg-neutral-800'}`}
            >
              <ChevronRight size={18} color="white" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
