import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// A short "rest over" cue. On web we synthesize a two-tone beep with the Web
// Audio API (no asset needed); on native we fire a success haptic (audio-file
// playback can be added later with expo-audio). Fully guarded so it never throws.
export function restEndCue(): void {
  if (Platform.OS === 'web') {
    try {
      const Ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const beep = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      beep(880, 0, 0.15);
      beep(1174, 0.16, 0.22);
      setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch { /* ignore */ }
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}
