// Training-readiness engine — the app's wearable-free differentiator.
// Readiness is derived from estimated muscle recovery + a self-reported energy
// check, so it works with zero hardware (unlike Whoop/Oura HRV scores).

export type MuscleRecovery = { name: string; recovery: number };

export type Energy = 'low' | 'good' | 'high' | null;

const ENERGY_ADJUST: Record<Exclude<Energy, null>, number> = {
  low: -15,
  good: 0,
  high: 10,
};

export function computeReadiness(muscles: MuscleRecovery[], energy: Energy): number {
  if (!muscles.length) return 0;
  const base = muscles.reduce((sum, m) => sum + m.recovery, 0) / muscles.length;
  const adj = energy ? ENERGY_ADJUST[energy] : 0;
  return Math.max(0, Math.min(100, Math.round(base + adj)));
}

export function readinessLabel(score: number): string {
  if (score >= 75) return 'Primed to train';
  if (score >= 55) return 'Good to go';
  if (score >= 35) return 'Train light today';
  return 'Prioritize recovery';
}

// Semantic readiness colors (green → amber → red), not the indigo brand accent.
export function readinessColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

// Shared subtle tint used by the muscle recovery map.
export function muscleTint(recovery: number): { bg: string; text: string } {
  if (recovery >= 80) return { bg: 'rgba(34,197,94,0.08)', text: '#4ade80' };
  if (recovery >= 40) return { bg: 'rgba(234,179,8,0.08)', text: '#facc15' };
  return { bg: 'rgba(239,68,68,0.08)', text: '#f87171' };
}
