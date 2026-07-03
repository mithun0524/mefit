import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from '@/tw';
import { Switch, Alert, Share, Platform } from 'react-native';
import { ChevronLeft, ChevronRight, Activity, Bell, Sparkles, Lock, Download, Info, Dumbbell, Ruler, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, type CoachingStyle } from '@/store/useAppStore';

const CARD = { backgroundColor: '#1c1c21', borderWidth: 1, borderColor: '#313138', borderRadius: 14 } as const;
const DIVIDER = '#26262c';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      {title ? <Text className="text-neutral-500 text-[12px] font-medium mb-2 ml-1">{title}</Text> : null}
      <View style={CARD} className="overflow-hidden">{children}</View>
    </View>
  );
}

function ToggleRow({ icon, label, sub, value, onChange, first }: any) {
  return (
    <View style={first ? undefined : { borderTopWidth: 1, borderTopColor: DIVIDER }} className="px-4 py-3.5 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1 pr-3">
        {icon}
        <View className="ml-3 flex-1">
          <Text className="text-white text-[15px]">{label}</Text>
          {sub ? <Text className="text-neutral-500 text-[12px] mt-0.5">{sub}</Text> : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#3a3a42', true: '#4f46e5' }} thumbColor="#ffffff" ios_backgroundColor="#3a3a42" />
    </View>
  );
}

function NavRow({ icon, label, value, onPress, danger, first, disabled }: any) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} className={`px-4 py-3.5 flex-row items-center justify-between ${disabled ? '' : 'active:opacity-60'}`} style={first ? undefined : { borderTopWidth: 1, borderTopColor: DIVIDER }}>
      <View className="flex-row items-center flex-1 pr-3">
        {icon}
        <Text className={`text-[15px] ${danger ? 'text-red-400' : 'text-white'} ${icon ? 'ml-3' : ''}`}>{label}</Text>
      </View>
      <View className="flex-row items-center">
        {value ? <Text className="text-neutral-500 text-[13px] mr-1">{value}</Text> : null}
        {!disabled && !danger ? <ChevronRight size={16} color="#52525b" /> : null}
      </View>
    </Pressable>
  );
}

function Segmented({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: any) => void }) {
  return (
    <View className="flex-row gap-1.5 px-4 py-3">
      {options.map(o => {
        const active = value === o.key;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={{ backgroundColor: active ? '#4f46e5' : '#26262c' }} className="flex-1 py-2 rounded-lg items-center active:opacity-70">
            <Text style={{ color: active ? '#fff' : '#a1a1aa' }} className="font-medium text-[13px]">{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, workouts, settings, updateProfile, updateSettings, setAuthenticated } = useAppStore();
  const set = (patch: any) => updateSettings(patch);

  const logOut = () => Alert.alert('Log out', 'Log out of your account?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: () => { onClose(); setAuthenticated(false); router.replace('/'); } },
  ]);

  const deleteAccount = () => Alert.alert('Delete account', 'This permanently removes your data. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { onClose(); setAuthenticated(false); router.replace('/'); } },
  ]);

  const exportCsv = async () => {
    const header = 'date,name,duration,volume_lbs,prs,exercises';
    const rows = workouts.map(w => `${w.date},"${w.name}",${w.duration},${w.volumeLbs},${w.prs},"${(w.exercises || '').replace(/"/g, "'")}"`);
    const csv = [header, ...rows].join('\n');
    try {
      await Share.share({ message: csv, title: 'workout-history.csv' });
    } catch {
      Alert.alert('Export', 'Sharing isn’t available here. On a device this exports your full workout history as CSV.');
    }
  };

  const healthStatus = Platform.OS === 'web' ? 'Not on web' : 'Connect';

  return (
    <Animated.View
      entering={SlideInRight.duration(280)}
      exiting={SlideOutRight.duration(240)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#09090b', zIndex: 200 }}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 20, paddingBottom: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#171717' }} className="flex-row items-center">
        <Pressable onPress={onClose} hitSlop={8} className="flex-row items-center active:opacity-60 -ml-1">
          <ChevronLeft size={22} color="#a1a1aa" />
        </Pressable>
        <Text className="text-white font-bold text-[19px] tracking-tight ml-1">Settings</Text>
      </View>

      <ScrollView className="flex-1" style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <Section title="Account">
          <NavRow first icon={<User size={17} color="#818cf8" />} label={profile.name} value={`@${profile.username}`} onPress={onClose} />
        </Section>

        <Section title="Units & display">
          <View>
            <View className="px-4 pt-3.5 pb-1"><Text className="text-white text-[15px]">Weight units</Text></View>
            <Segmented options={[{ key: 'lbs', label: 'Pounds (lbs)' }, { key: 'kgs', label: 'Kilograms (kg)' }]} value={profile.unit} onChange={(k) => updateProfile({ unit: k })} />
          </View>
          <ToggleRow icon={<Ruler size={17} color="#818cf8" />} label="Week starts Monday" value={settings.firstDayMonday} onChange={(v: boolean) => set({ firstDayMonday: v })} />
        </Section>

        <Section title="Workout">
          <ToggleRow first icon={<Bell size={17} color="#818cf8" />} label="Rest timer sound & vibration" value={settings.restSound} onChange={(v: boolean) => set({ restSound: v })} />
          <ToggleRow icon={<Dumbbell size={17} color="#818cf8" />} label="Keep screen awake" sub="During an active workout" value={settings.keepAwake} onChange={(v: boolean) => set({ keepAwake: v })} />
          <ToggleRow icon={<Activity size={17} color="#818cf8" />} label="Include warm-up sets in stats" value={settings.warmupInStats} onChange={(v: boolean) => set({ warmupInStats: v })} />
          <ToggleRow icon={<Sparkles size={17} color="#818cf8" />} label="RPE / effort logging" sub="Track how hard each set felt" value={settings.rpeLogging} onChange={(v: boolean) => set({ rpeLogging: v })} />
        </Section>

        <Section title="Integrations">
          <NavRow first icon={<Activity size={17} color="#10b981" />} label={Platform.OS === 'ios' ? 'Apple Health' : Platform.OS === 'android' ? 'Health Connect' : 'Apple Health / Health Connect'} value={healthStatus} disabled={Platform.OS === 'web'} onPress={() => Alert.alert('Health', 'Syncs HRV, sleep and heart rate to upgrade your readiness. Available in the device build.')} />
          <NavRow icon={<Activity size={17} color="#fb923c" />} label="Strava" value="Coming soon" disabled />
          <NavRow icon={<Activity size={17} color="#22c55e" />} label="Spotify" value="Coming soon" disabled />
        </Section>

        <Section title="AI coach">
          <View>
            <View className="px-4 pt-3.5 pb-1"><Text className="text-white text-[15px]">Coaching style</Text></View>
            <Segmented
              options={[{ key: 'supportive', label: 'Supportive' }, { key: 'balanced', label: 'Balanced' }, { key: 'direct', label: 'Direct' }]}
              value={settings.coachingStyle}
              onChange={(k: CoachingStyle) => set({ coachingStyle: k })}
            />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: DIVIDER }} className="px-4 py-3.5">
            <Text className="text-white text-[15px] mb-2">API key</Text>
            <TextInput
              value={profile.openAIApiKey}
              onChangeText={(t) => updateProfile({ openAIApiKey: t })}
              placeholder="Optional — override the built-in key"
              placeholderTextColor="#52525b"
              secureTextEntry
              autoCapitalize="none"
              style={{ backgroundColor: '#26262c', borderRadius: 8 }}
              className="px-3 py-2.5 text-white text-[14px]"
            />
            <Text className="text-neutral-600 text-[12px] mt-2">Model: nemotron-3-ultra (OpenRouter)</Text>
          </View>
        </Section>

        <Section title="Notifications">
          <ToggleRow first icon={<Bell size={17} color="#818cf8" />} label="Personal record alerts" value={settings.prAlerts} onChange={(v: boolean) => set({ prAlerts: v })} />
          <ToggleRow icon={<Bell size={17} color="#818cf8" />} label="Workout reminders" sub="Delivered on the device build" value={settings.workoutReminders} onChange={(v: boolean) => set({ workoutReminders: v })} />
        </Section>

        <Section title="Privacy">
          <ToggleRow first icon={<Lock size={17} color="#818cf8" />} label="Private profile" sub="Hide your activity from others" value={profile.isPrivate} onChange={(v: boolean) => updateProfile({ isPrivate: v })} />
        </Section>

        <Section title="Your data">
          <NavRow first icon={<Download size={17} color="#818cf8" />} label="Export workout history (CSV)" onPress={exportCsv} />
        </Section>

        <Section title="About">
          <NavRow first icon={<Info size={17} color="#818cf8" />} label="Version" value="1.0.0" disabled />
          <NavRow label="Support" onPress={() => Alert.alert('Support', 'Reach us at support@silly-galileo.app')} />
          <NavRow label="Terms & privacy" onPress={() => Alert.alert('Terms & privacy', 'Your data stays on your device unless you export it.')} />
        </Section>

        <Section title="">
          <NavRow first danger label="Log out" onPress={logOut} />
          <NavRow danger label="Delete account" onPress={deleteAccount} />
        </Section>
      </ScrollView>
    </Animated.View>
  );
}
