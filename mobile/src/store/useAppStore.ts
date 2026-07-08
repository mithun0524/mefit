import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export type Unit = 'lbs' | 'kgs';

export interface ProfileState {
  name: string;
  username: string;
  bio: string;
  avatarImage: string | null;
  unit: Unit;
  isPrivate: boolean;
  weight: string;
  height: string;
  openAIApiKey: string;
  goal?: string;          // from onboarding
  trainingDays?: string;
  equipment?: string;
  experience?: string;
}

export type CoachingStyle = 'supportive' | 'balanced' | 'direct';

export interface AppSettings {
  coachingStyle: CoachingStyle;
  restSound: boolean;
  keepAwake: boolean;
  warmupInStats: boolean;
  rpeLogging: boolean;
  prAlerts: boolean;
  workoutReminders: boolean;
  firstDayMonday: boolean;
}

export interface LoggedSet { weight: number; reps: number; completed: boolean; isWarmup?: boolean; rpe?: number }
export interface LoggedExercise { name: string; muscles?: string[]; sets: LoggedSet[] }

export interface WorkoutRecord {
  id: string | number;
  name: string;
  date: string;
  timestamp: number;
  duration: string;
  volumeLbs: number;
  prs: number;
  exercises: string;                    // human-readable summary (kept for cards/search)
  loggedExercises?: LoggedExercise[];    // structured per-exercise history (real PRs, recovery)
}

export interface CompletedWorkoutSummary {
  name: string;
  durationMins: number;
  volumeLbs: number;
  setsCompleted: number;
  totalSets: number;
  prs: number;
  exercises: Array<{
    name: string;
    sets: Array<{ weight: number; reps: number; completed: boolean }>;
  }>;
}

export interface RoutineExerciseSet {
  reps: number;
  repsMax?: number;   // upper bound when the exercise uses a rep range (e.g. 8–12)
  weight: number;
}

export interface RoutineExercise {
  id: number;
  name: string;
  isBarbell: boolean;
  isBodyweight?: boolean;
  muscles?: string[];
  restSeconds?: number;   // rest between sets; 0/undefined = off
  repRange?: boolean;     // show reps as a min–max range
  supersetGroup?: number; // exercises sharing a group id are a superset
  sets: RoutineExerciseSet[];
}

export interface Routine {
  id: string;
  name: string;
  duration: string;
  muscles: string[];
  exercises: RoutineExercise[];
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
  replies: any[];
}

export interface FeedPost {
  id: string;
  userId: string;
  user: string;
  avatar: string;
  avatarImage: string | null;
  time: string;
  images: string[];
  caption: string;
  workout?: string;
  volume?: string;
  prs?: number;
  likes: number;
  saves: number;
  liked?: boolean;
  saved?: boolean;
  commentCount: number;
  initialComments: Comment[];
}

// The live in-progress workout. Persisted so a session survives an app restart
// (resume-workout) and is shared across screens (the coach can log into it).
export interface ActiveSession {
  routineName: string | null;
  exercises: any[]; // live exercises; each set is { weight, reps, completed }
  startTime: number;
}

export interface AppState {
  isAuthenticated: boolean;
  profile: ProfileState;
  workouts: WorkoutRecord[];
  routines: Routine[];
  feed: FeedPost[];
  lastCompletedWorkout: CompletedWorkoutSummary | null;
  energyToday: { date: string; value: 'low' | 'good' | 'high' } | null;
  settings: AppSettings;
  activeSession: ActiveSession | null;

  // Actions
  setAuthenticated: (authenticated: boolean) => void;
  updateProfile: (updates: Partial<ProfileState>) => void;
  addWorkout: (workout: Omit<WorkoutRecord, 'id' | 'timestamp'>) => void;
  addFeedPost: (post: FeedPost) => void;
  toggleLikePost: (id: string) => void;
  toggleSavePost: (id: string) => void;
  deleteWorkout: (id: string | number) => void;
  addRoutine: (routine: Omit<Routine, 'id'>) => void;
  updateRoutine: (id: string, updates: Partial<Omit<Routine, 'id'>>) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => void;
  setLastCompletedWorkout: (summary: CompletedWorkoutSummary | null) => void;
  setEnergyToday: (energyToday: { date: string; value: 'low' | 'good' | 'high' } | null) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  // Live workout session
  startSession: (routineName: string | null, exercises: any[]) => void;
  endSession: () => void;
  setSessionExercises: (updater: any[] | ((prev: any[]) => any[])) => void;
  logCompletedSet: (name: string, weight: number, reps: number) => void;
}

const INITIAL_SETTINGS: AppSettings = {
  coachingStyle: 'balanced',
  restSound: true,
  keepAwake: true,
  warmupInStats: true,
  rpeLogging: false,
  prAlerts: true,
  workoutReminders: false,
  firstDayMonday: true,
};

// --- Initial Data ---

const INITIAL_PROFILE: ProfileState = {
  name: 'John Doe',
  username: 'johndoe',
  bio: 'Lifting for strength & consistency. Aiming for 1.5M lbs lifted this month. Core focus is progressive overload.',
  avatarImage: null,
  unit: 'lbs',
  isPrivate: false,
  weight: '175',
  height: "5'11\"",
  openAIApiKey: '',
};

const INITIAL_WORKOUTS: WorkoutRecord[] = [
  { id: 1, name: 'Upper Body Power', date: 'Yesterday', timestamp: Date.now() - 86400000, duration: '52 min', volumeLbs: 8400, prs: 1, exercises: 'Bench Press, Pull-ups, Shoulder Press' },
  { id: 2, name: 'Leg Day Annihilation', date: '4 days ago', timestamp: Date.now() - 86400000 * 4, duration: '65 min', volumeLbs: 15200, prs: 2, exercises: 'Barbell Squats, Romanian Deadlifts' },
  { id: 3, name: 'Core & Conditioning', date: 'Last week', timestamp: Date.now() - 86400000 * 7, duration: '35 min', volumeLbs: 4100, prs: 0, exercises: 'Hanging Leg Raises, Planks, Kettlebell Swings' }
];

const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'r-1',
    name: 'Upper Body Power',
    duration: '45-60 min',
    muscles: ['Chest', 'Back', 'Shoulders'],
    exercises: [
      { 
        id: 101, 
        name: 'Barbell Bench Press', 
        isBarbell: true, 
        sets: [
          { reps: 5, weight: 135 },
          { reps: 5, weight: 135 },
          { reps: 5, weight: 135 },
          { reps: 5, weight: 135 },
        ] 
      },
      { 
        id: 102, 
        name: 'Pull-ups', 
        isBarbell: false, 
        sets: [
          { reps: 8, weight: 0 },
          { reps: 8, weight: 0 },
          { reps: 8, weight: 0 },
        ] 
      },
    ]
  },
  {
    id: 'r-2',
    name: 'Leg Day Annihilation',
    duration: '60-75 min',
    muscles: ['Quads', 'Hamstrings', 'Glutes'],
    exercises: [
      { 
        id: 201, 
        name: 'Barbell Squat', 
        isBarbell: true, 
        sets: [
          { reps: 5, weight: 185 },
          { reps: 5, weight: 185 },
          { reps: 5, weight: 185 },
          { reps: 5, weight: 185 },
          { reps: 5, weight: 185 },
        ] 
      },
      { 
        id: 202, 
        name: 'Romanian Deadlift', 
        isBarbell: true, 
        sets: [
          { reps: 10, weight: 135 },
          { reps: 10, weight: 135 },
          { reps: 10, weight: 135 },
        ] 
      },
    ]
  },
  {
    id: 'r-3',
    name: 'Push Hypertrophy',
    duration: '50 min',
    muscles: ['Chest', 'Shoulders', 'Triceps'],
    exercises: [
      { 
        id: 301, 
        name: 'Incline Dumbbell Press', 
        isBarbell: false, 
        sets: [
          { reps: 10, weight: 45 },
          { reps: 10, weight: 45 },
          { reps: 10, weight: 45 },
          { reps: 10, weight: 45 },
        ] 
      },
      { 
        id: 302, 
        name: 'Tricep Pushdown', 
        isBarbell: false, 
        sets: [
          { reps: 12, weight: 30 },
          { reps: 12, weight: 30 },
          { reps: 12, weight: 30 },
        ] 
      },
    ]
  }
];

const INITIAL_FEED: FeedPost[] = [
  {
    id: 'p1',
    userId: 'user-1',
    user: 'Alex Chen',
    avatar: 'AC',
    avatarImage: null,
    time: '2h ago',
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop',
    ],
    caption: 'Crushed leg day today. 3 new PRs on squats 🔥',
    workout: 'Leg Day Annihilation',
    volume: '15.2k lbs',
    prs: 3,
    likes: 48,
    saves: 12,
    commentCount: 1,
    initialComments: [
      { id: 'c1', author: 'Sarah M.', avatar: 'SM', text: 'Those numbers are insane!! 🔥', time: '1h ago', likes: 4, liked: false, replies: [] }
    ],
  },
  {
    id: 'p2',
    userId: 'user-2',
    user: 'Sarah Miller',
    avatar: 'SM',
    avatarImage: null,
    time: '5h ago',
    images: ['https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=800&auto=format&fit=crop'],
    caption: 'Morning upper body session done. Nothing beats a 6am pump before work 💪',
    workout: 'Upper Body Power',
    volume: '8.4k lbs',
    prs: 0,
    likes: 24,
    saves: 5,
    commentCount: 0,
    initialComments: [],
  }
];

// --- Store ---

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      profile: INITIAL_PROFILE,
      workouts: INITIAL_WORKOUTS,
      routines: INITIAL_ROUTINES,
      feed: INITIAL_FEED,
      lastCompletedWorkout: null,
      energyToday: null,
      settings: INITIAL_SETTINGS,
      activeSession: null,

      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      updateProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates }
      })),
      
      addWorkout: (workout) => set((state) => ({
        workouts: [{ ...workout, id: Date.now().toString(), timestamp: Date.now() }, ...state.workouts]
      })),

      toggleLikePost: (id) => set((state) => ({
        feed: state.feed.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)
      })),
      toggleSavePost: (id) => set((state) => ({
        feed: state.feed.map(p => p.id === id ? { ...p, saved: !p.saved, saves: p.saves + (p.saved ? -1 : 1) } : p)
      })),
      addFeedPost: (post) => set((state) => ({
        feed: [post, ...state.feed]
      })),

      deleteWorkout: (id) => set((state) => ({
        workouts: state.workouts.filter(w => w.id !== id)
      })),

      addRoutine: (routine) => set((state) => ({
        routines: [{ ...routine, id: `r-${Date.now()}` }, ...state.routines]
      })),

      updateRoutine: (id, updates) => set((state) => ({
        routines: state.routines.map((routine) => (
          routine.id === id ? { ...routine, ...updates } : routine
        ))
      })),

      deleteRoutine: (id) => set((state) => ({
        routines: state.routines.filter(routine => routine.id !== id)
      })),

      duplicateRoutine: (id) => set((state) => {
        const routine = state.routines.find((item) => item.id === id);
        if (!routine) return state;

        const duplicatedRoutine: Routine = {
          ...routine,
          id: `r-${Date.now()}`,
          name: `${routine.name} Copy`,
          exercises: routine.exercises.map((exercise, index) => ({
            ...exercise,
            id: exercise.id + index + 1000,
            sets: exercise.sets.map(s => ({ ...s })),
          })),
        };

        return {
          routines: [duplicatedRoutine, ...state.routines],
        };
      }),

      setLastCompletedWorkout: (summary) => set({ lastCompletedWorkout: summary }),
      setEnergyToday: (energyToday) => set({ energyToday }),
      updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),

      // ── Live workout session ──────────────────────────────
      startSession: (routineName, exercises) => set({ activeSession: { routineName, exercises, startTime: Date.now() } }),
      endSession: () => set({ activeSession: null }),
      setSessionExercises: (updater) => set((state) => {
        if (!state.activeSession) return {} as any;
        const exercises = typeof updater === 'function' ? updater(state.activeSession.exercises) : updater;
        return { activeSession: { ...state.activeSession, exercises } };
      }),
      // Append a completed set to the named exercise in the live session
      // (adds the exercise if it isn't there yet). Used by the coach's log_set tool.
      logCompletedSet: (name, weight, reps) => set((state) => {
        if (!state.activeSession) return {} as any;
        const exercises = [...state.activeSession.exercises];
        const idx = exercises.findIndex((e: any) => String(e.name).toLowerCase() === name.toLowerCase());
        const s = { weight, reps, completed: true };
        if (idx >= 0) exercises[idx] = { ...exercises[idx], sets: [...exercises[idx].sets, s] };
        else exercises.push({ id: Date.now(), name, isBarbell: false, sets: [s] });
        return { activeSession: { ...state.activeSession, exercises } };
      }),
    }),
    {
      name: 'silly-galileo-storage-v5',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
