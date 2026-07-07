import { supabase } from './supabase';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// True only when a REAL Supabase project is configured (not the placeholder
// fallback in supabase.ts). When false the app runs in local-only mode: auth
// screens accept any input and everything persists to AsyncStorage.
export function hasSupabase(): boolean {
  return /^https?:\/\/.+\.supabase\.(co|in|net)/.test(URL) && ANON.length > 20 && !ANON.includes('placeholder');
}

export type AuthResult = { ok: boolean; error?: string; needsConfirmation?: boolean };

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!hasSupabase()) return { ok: true }; // local mode — proceed
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!hasSupabase()) return { ok: true };
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return { ok: false, error: error.message };
  // With email confirmation enabled there is no session until the user confirms.
  return { ok: true, needsConfirmation: !data.session };
}

export async function signOutRemote(): Promise<void> {
  if (hasSupabase()) { try { await supabase.auth.signOut(); } catch { /* ignore */ } }
}

// Restore a persisted Supabase session at launch.
// Returns true/false when Supabase is configured, or null in local mode
// (caller should then keep the persisted local `isAuthenticated` flag).
export async function restoreSession(): Promise<boolean | null> {
  if (!hasSupabase()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch { return false; }
}
