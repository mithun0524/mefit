-- Enable pgvector extension for semantic search (AI workout suggestions)
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  goals text,
  limitations text,
  experience_level text,
  preferences jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Exercises table
CREATE TABLE public.exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  muscle_group text,
  equipment text,
  description text,
  embedding vector(1536), -- Vector representation for semantic search
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workouts table (A session)
CREATE TABLE public.workouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  notes text,
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at timestamp with time zone
);

-- Workout Exercises (Link a workout to multiple exercises)
CREATE TABLE public.workout_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index integer NOT NULL
);

-- Sets table
CREATE TABLE public.sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_exercise_id uuid REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps integer,
  weight numeric,
  rpe numeric, -- Rate of Perceived Exertion
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Exercises: Anyone can read
CREATE POLICY "Anyone can read exercises" ON public.exercises FOR SELECT USING (true);

-- Workouts: Users can manage their own workouts
CREATE POLICY "Users can manage own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);

-- Sets: Users can manage their own sets via workout_exercises -> workouts
-- (Requires a more complex policy or just use security definer functions for nested writes, keeping it simple for now)
