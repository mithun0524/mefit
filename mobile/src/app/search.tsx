import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Sparkles, Dumbbell, Users, MessageCircle, X, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';

type SearchTab = 'all' | 'routines' | 'workouts' | 'people' | 'posts';

export default function SearchScreen() {
  const router = useRouter();
  const { routines, workouts, feed, profile } = useAppStore();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');

  const people = useMemo(() => {
    const seen = new Set<string>();
    return feed
      .map((post) => ({ id: post.userId, name: post.user, avatar: post.avatar, avatarImage: post.avatarImage }))
      .filter((person) => {
        if (person.id === 'me') return false;
        if (seen.has(person.id)) return false;
        seen.add(person.id);
        return true;
      });
  }, [feed]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredRoutines = useMemo(
    () => routines.filter((routine) => {
      if (!normalizedQuery) return true;
      return [routine.name, routine.duration, routine.muscles.join(' '), routine.exercises.map((exercise) => exercise.name).join(' ')].join(' ').toLowerCase().includes(normalizedQuery);
    }),
    [normalizedQuery, routines]
  );

  const filteredWorkouts = useMemo(
    () => workouts.filter((workout) => {
      if (!normalizedQuery) return true;
      return [workout.name, workout.exercises, workout.date].join(' ').toLowerCase().includes(normalizedQuery);
    }),
    [normalizedQuery, workouts]
  );

  const filteredPosts = useMemo(
    () => feed.filter((post) => {
      if (!normalizedQuery) return true;
      return [post.user, post.caption, post.workout || '', post.volume || ''].join(' ').toLowerCase().includes(normalizedQuery);
    }),
    [feed, normalizedQuery]
  );

  const filteredPeople = useMemo(
    () => people.filter((person) => {
      if (!normalizedQuery) return true;
      return person.name.toLowerCase().includes(normalizedQuery);
    }),
    [normalizedQuery, people]
  );

  const clearQuery = () => setQuery('');

  const tabs: { id: SearchTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'routines', label: 'Routines' },
    { id: 'workouts', label: 'Workouts' },
    { id: 'people', label: 'People' },
    { id: 'posts', label: 'Posts' },
  ];

  const ResultCard = ({ title, subtitle, meta, onPress, icon }: { title: string; subtitle: string; meta?: string; onPress: () => void; icon: React.ReactNode }) => (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-4 active:bg-neutral-850">
      <View className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-sm tracking-tight">{title}</Text>
        <Text className="text-neutral-400 text-xs font-medium mt-0.5" numberOfLines={2}>{subtitle}</Text>
        {meta ? <Text className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{meta}</Text> : null}
      </View>
      <ChevronRight size={16} color="#71717a" />
    </Pressable>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="pt-10 pb-4 px-5 bg-neutral-950 border-b border-neutral-900/60 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-lg border border-neutral-800 bg-neutral-900 items-center justify-center active:bg-neutral-850">
          <ArrowLeft size={18} color="#e5e7eb" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Discovery</Text>
          <Text className="text-2xl font-extrabold text-white tracking-tight">Search</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/coach')} className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 active:bg-indigo-500/15 flex-row items-center gap-2">
          <Sparkles size={14} color="#c4b5fd" />
          <Text className="text-indigo-300 font-bold text-[10px] uppercase tracking-[0.22em]">AI</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 mb-4 shadow-sm">
          <Search size={18} color="#71717a" className="mr-2" />
          <TextInput
            className="flex-1 text-base text-white font-medium"
            placeholder="Search routines, workouts, people..."
            placeholderTextColor="#52525b"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 ? (
            <Pressable onPress={clearQuery} className="w-8 h-8 rounded-full bg-neutral-800 items-center justify-center active:bg-neutral-700">
              <X size={14} color="#d4d4d8" />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5" contentContainerStyle={{ gap: 10 }}>
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                className={`px-4 py-2 rounded-full border ${active ? 'bg-indigo-600 border-indigo-500' : 'bg-neutral-900 border-neutral-800'}`}
              >
                <Text className={`text-[10px] font-bold uppercase tracking-[0.2em] ${active ? 'text-white' : 'text-neutral-400'}`}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 mb-5 shadow-sm">
          <Text className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.28em] mb-2">Quick actions</Text>
          <View className="flex-row gap-3">
            <Pressable onPress={() => router.push('/(tabs)/workout')} className="flex-1 rounded-lg bg-indigo-600 px-3 py-3 items-center active:bg-indigo-700">
              <Dumbbell size={16} color="white" />
              <Text className="text-white font-bold text-xs uppercase tracking-[0.2em] mt-2">Start workout</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/coach')} className="flex-1 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-3 items-center active:bg-neutral-850">
              <MessageCircle size={16} color="#c4b5fd" />
              <Text className="text-neutral-200 font-bold text-xs uppercase tracking-[0.2em] mt-2">Ask coach</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/profile')} className="flex-1 rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-3 items-center active:bg-neutral-850">
              <Users size={16} color="#a1a1aa" />
              <Text className="text-neutral-200 font-bold text-xs uppercase tracking-[0.2em] mt-2">Profile</Text>
            </Pressable>
          </View>
        </View>

        {(tab === 'all' || tab === 'routines') && (
          <View className="mb-5">
            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.28em] mb-3">Routines</Text>
            <View className="gap-3">
              {filteredRoutines.map((routine) => (
                <ResultCard
                  key={routine.id}
                  title={routine.name}
                  subtitle={`${routine.muscles.join(' • ')} · ${routine.duration}`}
                  meta={`${routine.exercises.length} exercises`}
                  onPress={() => router.push('/(tabs)/workout')}
                  icon={<Dumbbell size={16} color="#c4b5fd" />}
                />
              ))}
            </View>
          </View>
        )}

        {(tab === 'all' || tab === 'workouts') && (
          <View className="mb-5">
            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.28em] mb-3">Workouts</Text>
            <View className="gap-3">
              {filteredWorkouts.map((workout) => (
                <ResultCard
                  key={workout.id}
                  title={workout.name}
                  subtitle={`${workout.duration} · ${workout.exercises}`}
                  meta={`${workout.volumeLbs.toLocaleString()} lbs`}
                  onPress={() => router.push('/(tabs)/profile')}
                  icon={<Dumbbell size={16} color="#818cf8" />}
                />
              ))}
            </View>
          </View>
        )}

        {(tab === 'all' || tab === 'people') && (
          <View className="mb-5">
            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.28em] mb-3">People</Text>
            <View className="gap-3">
              {filteredPeople.map((person) => (
                <ResultCard
                  key={person.id}
                  title={person.name}
                  subtitle="Open profile and see their training feed"
                  onPress={() => router.push(`/user/${person.id}`)}
                  icon={<Users size={16} color="#f5f5f5" />}
                />
              ))}
            </View>
          </View>
        )}

        {(tab === 'all' || tab === 'posts') && (
          <View className="mb-8">
            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.28em] mb-3">Posts</Text>
            <View className="gap-3">
              {filteredPosts.map((post) => (
                <ResultCard
                  key={post.id}
                  title={post.user}
                  subtitle={post.caption}
                  meta={post.workout || 'Community post'}
                  onPress={() => router.push('/(tabs)/feed')}
                  icon={<MessageCircle size={16} color="#c4b5fd" />}
                />
              ))}
            </View>
          </View>
        )}

        <View className="pb-10">
          <Text className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.28em] mb-2">Tip</Text>
          <Text className="text-neutral-400 text-sm leading-6">Use search to jump directly into a workout, profile, or AI coach flow. It is built to feel like the app, not a separate feature.</Text>
        </View>

        {profile.name && query.trim().length === 0 && (
          <View className="h-4" />
        )}
      </ScrollView>
    </View>
  );
}