import { create } from 'zustand';

// Transient UI state (not persisted) — e.g. the settings overlay.
type UIState = {
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

export const useUI = create<UIState>((set) => ({
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
