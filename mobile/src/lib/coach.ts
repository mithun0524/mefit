import type { WorkoutRecord, ProfileState } from '@/store/useAppStore';
import { computeMuscleRecovery } from '@/lib/recovery';
import { computeReadiness, readinessLabel } from '@/lib/readiness';
import { deriveDashboardStats } from '@/lib/stats';

type Attachment = { id: string; type: 'image' | 'file'; uri: string; name: string };
type ChatTurn = { sender: 'ai' | 'user'; text: string };

// OpenRouter (OpenAI-compatible). Key comes from a gitignored .env (never committed).
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
const DEFAULT_KEY = process.env.EXPO_PUBLIC_OPENROUTER_KEY || '';

function resolveKey(profile: ProfileState): string {
  return profile.openAIApiKey?.trim() || DEFAULT_KEY;
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
    `Recent workouts:\n${recent}`,
  ].join('\n');
}

const SYSTEM = (context: string) => `You are Coach AI, an expert strength & conditioning coach living inside a workout-tracking app.
Answer directly and keep your internal reasoning brief — do NOT over-analyze before responding.
Be concise, practical and encouraging. Use markdown (bold, short lists, small tables) when it helps.
Ground EVERY answer in the athlete's real data below — reference their actual readiness, muscle recovery, and recent sessions. Never invent numbers that aren't in the data. If readiness is low or a muscle group is fatigued, factor that into your advice. Keep replies under ~150 words unless asked for a full plan.

=== ATHLETE DATA (today) ===
${context}`;

// Always true now — a default OpenRouter key ships with the app.
export function hasCoachKey(_profile: ProfileState): boolean {
  return true;
}

// Calls OpenRouter (OpenAI-compatible) with the poolside/laguna-m.1 free model.
export async function getCoachReply(opts: {
  profile: ProfileState;
  workouts: WorkoutRecord[];
  history: ChatTurn[];
  userText: string;
  attachments: Attachment[];
}): Promise<string> {
  const { profile, workouts, history, userText, attachments } = opts;
  const apiKey = resolveKey(profile);
  const images = attachments.filter(a => a.type === 'image');

  // laguna-m.1 is a text-only reasoning model — it cannot accept images.
  if (images.length && !userText.trim()) {
    return "I can't view images on the current coach model — it's text-only. Describe what you'd like feedback on (e.g. your form cue or the exercise) and I'll help.";
  }

  const messages: any[] = [{ role: 'system', content: SYSTEM(buildCoachContext(profile, workouts)) }];
  history.slice(-8).forEach(m => messages.push({ role: m.sender === 'ai' ? 'assistant' : 'user', content: m.text }));
  messages.push({ role: 'user', content: userText });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000); // free reasoning model can be slow
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
      // Reasoning model: needs generous budget so thinking + answer both fit.
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.6, max_tokens: 3000 }),
    });
  } catch (e: any) {
    throw new Error(e?.name === 'AbortError' ? 'The coach took too long to respond — try again.' : 'Network error');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const msg = res.status === 401 ? 'Invalid API key' : `HTTP ${res.status}${body ? ` — ${body.slice(0, 120)}` : ''}`;
    throw new Error(msg);
  }
  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    // Rare: model spent the whole budget reasoning without emitting an answer.
    return 'That one needs a shorter, more specific ask — try breaking it into one question.';
  }
  // Text-only model answered the text; note that the image was ignored.
  if (images.length) content = `_(I can't see images on the current model, so I'm answering from your message + data.)_\n\n${content}`;
  return content;
}
