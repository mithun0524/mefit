import { Platform } from 'react-native';

// Today's recovery signals from the platform health store.
export type HealthSignals = {
  hrv: number | null;         // RMSSD/SDNN in ms
  sleepScore: number | null;  // 0-100
  restingHR: number | null;   // bpm
  source: 'healthkit' | 'health-connect' | 'none';
};

const EMPTY: HealthSignals = { hrv: null, sleepScore: null, restingHR: null, source: 'none' };

/**
 * Reads today's health signals.
 *
 * Web / Expo Go → returns EMPTY, so readiness falls back to the estimate.
 * On a device (EAS/dev build) → replace the TODO bodies with the real reads:
 *   - iOS:     @kingstinct/react-native-healthkit  → HRV (SDNN), Sleep Analysis, Resting HR
 *   - Android: react-native-health-connect          → HeartRateVariabilityRmssd, SleepSession, RestingHeartRate
 * Keep this the ONLY place that touches native health APIs, guarded so the web
 * bundle never imports a native-only module.
 */
export async function getHealthSignals(): Promise<HealthSignals> {
  try {
    if (Platform.OS === 'ios') {
      // TODO(device): HealthKit reads go here. Returns EMPTY until wired.
      return { ...EMPTY, source: 'none' };
    }
    if (Platform.OS === 'android') {
      // TODO(device): Health Connect reads go here. Returns EMPTY until wired.
      return { ...EMPTY, source: 'none' };
    }
    return EMPTY; // web / unsupported
  } catch {
    return EMPTY;
  }
}

export function hasHealthData(s: HealthSignals | null | undefined): boolean {
  return !!s && (s.sleepScore != null || s.hrv != null || s.restingHR != null);
}
