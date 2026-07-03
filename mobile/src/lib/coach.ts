import { useAppStore } from '@/store/useAppStore';
import type { WorkoutRecord, ProfileState, CoachingStyle, Routine, RoutineExercise } from '@/store/useAppStore';
import { computeMuscleRecovery } from '@/lib/recovery';
import { computeReadiness, readinessLabel } from '@/lib/readiness';
import { deriveDashboardStats } from '@/lib/stats';

type Attachment = { id: string; type: 'image' | 'file'; uri: string; name: string };
type ChatTurn = { sender: 'ai' | 'user'; text: string };

// OpenRouter (OpenAI-compatible). Key comes from a gitignored .env (never committed).
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'; // reasoning + tool-calling capable
const DEFAULT_KEY = process.env.EXPO_PUBLIC_OPENROUTER_KEY || '';

function resolveKey(profile: ProfileState): string {
  return profile.openAIApiKey?.trim() || DEFAULT_KEY;
}

// ─────────────────────────────────────────────────────────────
//  RESULT SHAPE — the coach can now DO things, not just talk.
// ─────────────────────────────────────────────────────────────
export interface CoachCreatedRoutine { id: string; name: string; exercises: number; muscles: string[] }
export interface CoachDeleted { id: string; name: string }
export interface CoachStart { id: string; name: string }
export interface CoachChoice { question: string; options: string[] }
export interface CoachReply {
  text: string;
  created?: CoachCreatedRoutine[];  // routines the coach just added
  updated?: CoachCreatedRoutine[];  // routines it edited
  deleted?: CoachDeleted[];         // routines it removed
  startWorkout?: CoachStart;        // routine ready to start → UI shows a Start card
  choice?: CoachChoice;             // MCQ awaiting the user's tap
}

// A compact, real snapshot of the athlete for the model to reason over.
export function buildCoachContext(profile: ProfileState, workouts: WorkoutRecord[]): string {
  const recovery = computeMuscleRecovery(workouts);
  const readiness = computeReadiness(recovery, null);
  const stats = deriveDashboardStats(workouts);
  const recoveryLines = recovery.map(m => `${m.name} ${m.recovery}%`).join(', ');
  const recent = workouts.slice(0, 5)
    .map(w => `- ${w.name} (${w.date}, ${w.volumeLbs} ${profile.unit}, ${w.prs} PR) — ${w.exercises}`)
    .join('\n') || '- none logged yet';
  const routines = useAppStore.getState().routines;
  const routineLines = routines.length
    ? routines.map(r => {
        const names = r.exercises.map(e => e.name).join(', ') || 'empty';
        return `- "${r.name}" [id: ${r.id}] — ${r.exercises.length} exercises: ${names}`;
      }).join('\n')
    : '- none yet';
  const prefs = [
    profile.goal && `Goal: ${profile.goal}`,
    profile.experience && `Experience: ${profile.experience}`,
    profile.trainingDays && `Trains: ${profile.trainingDays}`,
    profile.equipment && `Equipment: ${profile.equipment}`,
  ].filter(Boolean).join('. ');
  return [
    `Athlete: ${profile.name}. Units: ${profile.unit}. Weight: ${profile.weight}. Height: ${profile.height}.`,
    prefs ? `Preferences — ${prefs}.` : '',
    `Training readiness today: ${readiness}/100 (${readinessLabel(readiness)}).`,
    `Estimated muscle recovery: ${recoveryLines}.`,
    `This week: ${stats.daysThisWeek} days trained, ${stats.thisWeekK}k ${profile.unit} volume, ${stats.streak}-day streak, ${stats.prsThisMonth} PRs this month.`,
    `Existing routines in the app:\n${routineLines}`,
    `Recent workouts:\n${recent}`,
  ].join('\n');
}

const TONE: Record<CoachingStyle, string> = {
  supportive: 'Tone: warm, encouraging and positive — celebrate effort.',
  balanced: 'Tone: practical and encouraging.',
  direct: 'Tone: blunt and no-nonsense — skip pleasantries, get to the point.',
};

const SYSTEM = (context: string, style: CoachingStyle = 'balanced') => `You are Coach AI, an expert strength & conditioning coach that lives INSIDE a workout-tracking app and can act on it directly.
${TONE[style]}
Keep internal reasoning brief — do NOT over-analyze before responding. Be concise and practical. Use markdown (bold, short lists, small tables) when it helps. Ground every answer in the athlete's real data below; never invent numbers.

=== HOW TO ACT (tools) ===
You have tools. USE THEM instead of only describing things — the ONLY way a routine actually exists/changes is via a tool call, never by pasting a table.
- create_routine: user wants a routine / plan / split BUILT. Call ONCE PER ROUTINE (a 3-day split = 3 calls).
- update_routine: user wants an EXISTING routine changed (rename, swap/add/remove exercises, adjust sets). Pass its id from the routine list below. When you pass exercises, pass the FULL new exercise list (it replaces the old one).
- delete_routine: user wants a routine removed. Pass its id.
- start_workout: user wants to START / do / train a routine now. Pass its id; the app opens the live workout.
- ask_choice: when a request is ambiguous and one detail changes the plan (days/week, equipment, goal), ask ONE short multiple-choice question BEFORE acting. At most one question, then act.
Use ids from the "Existing routines" list to update/delete/start. Sensible defaults: if the user says "just do it" / "nope create", stop asking and act with reasonable assumptions from their data. After acting, confirm in ONE short sentence and ask if it suits them. Factor readiness/fatigue into volume (lighter on fatigued muscles, hard on recovered ones).

=== ATHLETE DATA (today) ===
${context}`;

// ─────────────────────────────────────────────────────────────
//  TOOL SCHEMAS (OpenAI-compatible function calling)
// ─────────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_routine',
      description: 'Create and save a workout routine in the app. Call once per routine.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Routine name, e.g. "Push Day"' },
          muscles: { type: 'array', items: { type: 'string' }, description: 'Primary muscle groups, e.g. ["Chest","Shoulders","Triceps"]' },
          duration: { type: 'string', description: 'Estimated duration, e.g. "50 min"' },
          exercises: {
            type: 'array',
            description: 'Ordered list of exercises',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sets: { type: 'integer', description: 'Number of working sets' },
                reps: { type: 'integer', description: 'Target reps (lower bound if a range)' },
                repsMax: { type: 'integer', description: 'Upper bound of the rep range; omit for a fixed rep target' },
                restSeconds: { type: 'integer', description: 'Rest between sets in seconds' },
                isBodyweight: { type: 'boolean' },
                isBarbell: { type: 'boolean' },
                muscles: { type: 'array', items: { type: 'string' } },
                supersetGroup: { type: 'integer', description: 'Same number = supersetted together' },
              },
              required: ['name', 'sets', 'reps'],
            },
          },
        },
        required: ['name', 'exercises'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_routine',
      description: 'Edit an existing routine. Provide its id. To change exercises, pass the FULL replacement list.',
      parameters: {
        type: 'object',
        properties: {
          routineId: { type: 'string', description: 'id of the routine to edit (from the routine list)' },
          name: { type: 'string', description: 'New name (optional)' },
          muscles: { type: 'array', items: { type: 'string' } },
          duration: { type: 'string' },
          exercises: {
            type: 'array',
            description: 'Full replacement exercise list (optional; omit to keep current exercises)',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'integer' },
                repsMax: { type: 'integer' },
                restSeconds: { type: 'integer' },
                isBodyweight: { type: 'boolean' },
                isBarbell: { type: 'boolean' },
                muscles: { type: 'array', items: { type: 'string' } },
                supersetGroup: { type: 'integer' },
              },
              required: ['name', 'sets', 'reps'],
            },
          },
        },
        required: ['routineId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_routine',
      description: 'Delete a routine from the app. Provide its id.',
      parameters: {
        type: 'object',
        properties: { routineId: { type: 'string', description: 'id of the routine to delete' } },
        required: ['routineId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_workout',
      description: 'Start a live workout session from a routine. Provide its id. Opens the workout screen.',
      parameters: {
        type: 'object',
        properties: { routineId: { type: 'string', description: 'id of the routine to start' } },
        required: ['routineId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_choice',
      description: 'Ask the user a single multiple-choice question to resolve an ambiguity before acting.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, description: '2-5 short options' },
        },
        required: ['question', 'options'],
      },
    },
  },
];

// Turn the model's loose exercise list into store-shaped RoutineExercises.
function mapExercises(raw: any): RoutineExercise[] {
  const list: any[] = Array.isArray(raw) ? raw : [];
  return list.map((e, idx) => {
    const setCount = Math.min(10, Math.max(1, Number(e?.sets) || 3));
    const reps = Math.max(1, Number(e?.reps) || 10);
    const repsMax = e?.repsMax != null && Number(e.repsMax) > reps ? Number(e.repsMax) : undefined;
    return {
      id: idx + 1,
      name: String(e?.name || 'Exercise'),
      isBarbell: !!e?.isBarbell,
      isBodyweight: !!e?.isBodyweight,
      muscles: Array.isArray(e?.muscles) ? e.muscles.map(String) : undefined,
      restSeconds: e?.restSeconds != null ? Number(e.restSeconds) : undefined,
      repRange: repsMax != null,
      supersetGroup: e?.supersetGroup != null ? Number(e.supersetGroup) : undefined,
      sets: Array.from({ length: setCount }, () => ({ reps, repsMax, weight: 0 })),
    };
  });
}

// Resolve a routine by id, or fall back to a case-insensitive name match.
function findRoutine(idOrName: string) {
  const routines = useAppStore.getState().routines;
  const key = String(idOrName || '').trim().toLowerCase();
  return routines.find(r => r.id.toLowerCase() === key) || routines.find(r => r.name.toLowerCase() === key);
}

function executeCreateRoutine(args: any): CoachCreatedRoutine {
  const exercises = mapExercises(args?.exercises);
  const muscles: string[] = Array.isArray(args?.muscles) ? args.muscles.map(String) : [];
  const routine: Omit<Routine, 'id'> = {
    name: String(args?.name || 'New Routine'),
    duration: String(args?.duration || `${Math.max(20, exercises.length * 8)} min`),
    muscles,
    exercises,
  };
  useAppStore.getState().addRoutine(routine);
  const id = useAppStore.getState().routines[0]?.id || `r-${routine.name}`;
  return { id, name: routine.name, exercises: exercises.length, muscles };
}

function executeUpdateRoutine(args: any): { ok: boolean; summary?: CoachCreatedRoutine; error?: string } {
  const target = findRoutine(args?.routineId);
  if (!target) return { ok: false, error: 'routine not found' };
  const updates: any = {};
  if (args?.name) updates.name = String(args.name);
  if (args?.duration) updates.duration = String(args.duration);
  if (Array.isArray(args?.muscles)) updates.muscles = args.muscles.map(String);
  if (Array.isArray(args?.exercises)) updates.exercises = mapExercises(args.exercises);
  useAppStore.getState().updateRoutine(target.id, updates);
  const after = useAppStore.getState().routines.find(r => r.id === target.id);
  return { ok: true, summary: { id: target.id, name: after?.name || target.name, exercises: after?.exercises.length || 0, muscles: after?.muscles || [] } };
}

function executeDeleteRoutine(args: any): { ok: boolean; deleted?: CoachDeleted; error?: string } {
  const target = findRoutine(args?.routineId);
  if (!target) return { ok: false, error: 'routine not found' };
  useAppStore.getState().deleteRoutine(target.id);
  return { ok: true, deleted: { id: target.id, name: target.name } };
}

function resolveStart(args: any): { ok: boolean; start?: CoachStart; error?: string } {
  const target = findRoutine(args?.routineId);
  if (!target) return { ok: false, error: 'routine not found' };
  return { ok: true, start: { id: target.id, name: target.name } };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// The free model returns HTTP 200 with an embedded error body when the shared
// pool is briefly exhausted — treat those (+ 429/502/503) as transient and retry.
function isTransient(code?: number, msg = ''): boolean {
  return code === 429 || code === 502 || code === 503 ||
    /ResourceExhausted|Worker local|rate.?limit|temporarily|overloaded|try again/i.test(msg);
}

// One round-trip to the model, with retry on transient upstream errors.
async function callModel(messages: any[], apiKey: string): Promise<any> {
  let lastErr = 'Coach error';
  for (let attempt = 0; attempt < 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://silly-galileo.app',
          'X-Title': 'Coach AI',
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.5,
          max_tokens: 3000,
          tools: TOOLS,
          tool_choice: 'auto',
        }),
      });
    } catch (e: any) {
      throw new Error(e?.name === 'AbortError' ? 'The coach took too long to respond — try again.' : 'Network error');
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 401) throw new Error('Invalid API key');
      if (isTransient(res.status, body) && attempt < 3) { await sleep(1000 * (attempt + 1)); continue; }
      throw new Error(`HTTP ${res.status}${body ? ` — ${body.slice(0, 160)}` : ''}`);
    }

    const data = await res.json();
    if (data?.error) {
      lastErr = data.error.message || 'Coach error';
      if (isTransient(data.error.code, lastErr) && attempt < 3) { await sleep(1000 * (attempt + 1)); continue; }
      throw new Error(lastErr);
    }
    const msg = data?.choices?.[0]?.message;
    if (!msg) { lastErr = 'Empty response'; if (attempt < 3) { await sleep(800 * (attempt + 1)); continue; } }
    return msg;
  }
  throw new Error(`${lastErr} — the free coach is busy right now, try again in a moment.`);
}

// Always true now — a default OpenRouter key ships with the app.
export function hasCoachKey(_profile: ProfileState): boolean {
  return true;
}

// Agentic coach: reasons over live data AND can create routines / ask MCQs via tools.
export async function getCoachReply(opts: {
  profile: ProfileState;
  workouts: WorkoutRecord[];
  history: ChatTurn[];
  userText: string;
  attachments: Attachment[];
  style?: CoachingStyle;
}): Promise<CoachReply> {
  const { profile, workouts, history, userText, attachments, style } = opts;
  const apiKey = resolveKey(profile);
  const images = attachments.filter(a => a.type === 'image');

  if (images.length && !userText.trim()) {
    return { text: "I can't view images on the current coach model — it's text-only. Describe what you'd like feedback on and I'll help." };
  }

  const messages: any[] = [{ role: 'system', content: SYSTEM(buildCoachContext(profile, workouts), style) }];
  history.slice(-8).forEach(m => messages.push({ role: m.sender === 'ai' ? 'assistant' : 'user', content: m.text }));
  messages.push({ role: 'user', content: userText });

  const created: CoachCreatedRoutine[] = [];
  const updated: CoachCreatedRoutine[] = [];
  const deleted: CoachDeleted[] = [];
  let startWorkout: CoachStart | undefined;
  const acted = () => created.length || updated.length || deleted.length || startWorkout;
  const bundle = () => ({
    created: created.length ? created : undefined,
    updated: updated.length ? updated : undefined,
    deleted: deleted.length ? deleted : undefined,
    startWorkout,
  });

  // Tool-calling loop — bounded so a misbehaving model can't spin forever.
  for (let turn = 0; turn < 5; turn++) {
    const msg = await callModel(messages, apiKey);
    const toolCalls = msg?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      let content: string = (msg?.content || '').trim();
      if (!content) content = acted() ? 'Done.' : 'Try a shorter, more specific ask.';
      if (images.length) content = `_(I can't see images on the current model, so I'm answering from your message + data.)_\n\n${content}`;
      return { text: content, ...bundle() };
    }

    // Record the assistant's tool-call turn, then satisfy each call.
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: toolCalls });
    let choice: CoachChoice | null = null;

    for (const tc of toolCalls) {
      const name = tc?.function?.name;
      let args: any = {};
      try { args = JSON.parse(tc?.function?.arguments || '{}'); } catch { /* keep {} */ }
      const done = (r: any) => messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(r) });

      if (name === 'create_routine') {
        const c = executeCreateRoutine(args);
        created.push(c);
        done({ ok: true, id: c.id, name: c.name, exercises: c.exercises });
      } else if (name === 'update_routine') {
        const r = executeUpdateRoutine(args);
        if (r.ok && r.summary) updated.push(r.summary);
        done(r.ok ? { ok: true, id: r.summary!.id, name: r.summary!.name, exercises: r.summary!.exercises } : { ok: false, error: r.error });
      } else if (name === 'delete_routine') {
        const r = executeDeleteRoutine(args);
        if (r.ok && r.deleted) deleted.push(r.deleted);
        done(r.ok ? { ok: true, deleted: r.deleted!.name } : { ok: false, error: r.error });
      } else if (name === 'start_workout') {
        const r = resolveStart(args);
        if (r.ok && r.start) startWorkout = r.start;
        done(r.ok ? { ok: true, started: r.start!.name, note: 'Workout screen will open for the user.' } : { ok: false, error: r.error });
      } else if (name === 'ask_choice') {
        const options = (Array.isArray(args?.options) ? args.options.map(String) : []).slice(0, 5);
        choice = { question: String(args?.question || ''), options };
        done({ ok: true, presented: true });
      } else {
        done({ ok: false, error: 'unknown tool' });
      }
    }

    // ask_choice is terminal: hand the MCQ back to the UI and wait for a tap.
    if (choice) {
      const text = (msg?.content || '').trim() || choice.question || 'Which do you prefer?';
      return { text, choice, ...bundle() };
    }
    // Otherwise loop so the model can confirm what it did in words.
  }

  return { text: acted() ? 'Done.' : 'That took too many steps — try a simpler ask.', ...bundle() };
}
