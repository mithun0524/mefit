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
export interface CoachChoice { question: string; options: string[] }
export interface CoachReply {
  text: string;
  created?: CoachCreatedRoutine[]; // routines the coach just added to the app
  choice?: CoachChoice;            // a multiple-choice question awaiting the user's tap
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
    ? routines.map(r => `- ${r.name} (${r.exercises.length} exercises)`).join('\n')
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
You have tools. USE THEM instead of only describing things:
- create_routine: when the user wants a routine / plan / split BUILT, call this ONCE PER ROUTINE to actually add it to the app. Do not paste routine tables as text and claim they're created — the ONLY way a routine exists is via this tool. For a 3-day split, call it 3 times.
- ask_choice: when a request is ambiguous and one detail would change the plan (e.g. how many days/week, equipment, goal), ask ONE short multiple-choice question via this tool BEFORE building. Don't interrogate — at most one question, then act.
Sensible defaults: if the user says "just do it" / "nope create", stop asking and build with reasonable assumptions from their data. After creating routines, confirm in ONE short sentence and ask if it suits them or if they want tweaks. Factor readiness/fatigue into volume (go lighter on fatigued muscles, hard on recovered ones).

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

// Execute a create_routine tool call against the real store; return a summary.
function executeCreateRoutine(args: any): CoachCreatedRoutine {
  const rawExercises: any[] = Array.isArray(args?.exercises) ? args.exercises : [];
  const exercises: RoutineExercise[] = rawExercises.map((e, idx) => {
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
  const muscles: string[] = Array.isArray(args?.muscles) ? args.muscles.map(String) : [];
  const routine: Omit<Routine, 'id'> = {
    name: String(args?.name || 'New Routine'),
    duration: String(args?.duration || `${Math.max(20, exercises.length * 8)} min`),
    muscles,
    exercises,
  };
  const store = useAppStore.getState();
  store.addRoutine(routine);
  const id = useAppStore.getState().routines[0]?.id || `r-${routine.name}`;
  return { id, name: routine.name, exercises: exercises.length, muscles };
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

  // Tool-calling loop — bounded so a misbehaving model can't spin forever.
  for (let turn = 0; turn < 5; turn++) {
    const msg = await callModel(messages, apiKey);
    const toolCalls = msg?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      let content: string = (msg?.content || '').trim();
      if (!content) content = created.length ? 'Done — added to your routines.' : 'Try a shorter, more specific ask.';
      if (images.length) content = `_(I can't see images on the current model, so I'm answering from your message + data.)_\n\n${content}`;
      return { text: content, created: created.length ? created : undefined };
    }

    // Record the assistant's tool-call turn, then satisfy each call.
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: toolCalls });
    let choice: CoachChoice | null = null;

    for (const tc of toolCalls) {
      const name = tc?.function?.name;
      let args: any = {};
      try { args = JSON.parse(tc?.function?.arguments || '{}'); } catch { /* keep {} */ }

      if (name === 'create_routine') {
        const c = executeCreateRoutine(args);
        created.push(c);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ ok: true, id: c.id, name: c.name, exercises: c.exercises }) });
      } else if (name === 'ask_choice') {
        const options = (Array.isArray(args?.options) ? args.options.map(String) : []).slice(0, 5);
        choice = { question: String(args?.question || ''), options };
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ ok: true, presented: true }) });
      } else {
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ ok: false, error: 'unknown tool' }) });
      }
    }

    // ask_choice is terminal: hand the MCQ back to the UI and wait for a tap.
    if (choice) {
      const text = (msg?.content || '').trim() || choice.question || 'Which do you prefer?';
      return { text, choice, created: created.length ? created : undefined };
    }
    // Otherwise loop so the model can confirm the creation in words.
  }

  return { text: created.length ? 'Added to your routines.' : 'That took too many steps — try a simpler ask.', created: created.length ? created : undefined };
}
