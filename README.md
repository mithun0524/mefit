# MeFit — an AI-native, wearable-free training app

[![CI](https://github.com/mithun0524/mefit/actions/workflows/ci.yml/badge.svg)](https://github.com/mithun0524/mefit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-4f46e5.svg)](mobile/LICENSE)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000.svg?logo=expo)](https://docs.expo.dev/versions/v57.0.0/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61dafb.svg?logo=react)](https://reactnative.dev/)

MeFit is a workout tracker built around one idea: **a coach that actually does
things.** Ask it in plain language and it builds routines, edits them, starts
your session, and logs your sets — via real LLM tool-calling, streamed live so
you can see every step. It also estimates training readiness and per-muscle
recovery with **zero hardware** (no Whoop/Oura required), from your logged work
and a one-tap energy check.

> Status: **polished single-user client, running today.** Accounts/sync and
> on-device health are wired but optional — see [Project status](#project-status).

---

## Highlights

- **🤖 Agentic AI coach.** Real OpenAI-compatible function calling over
  [OpenRouter](https://openrouter.ai). The coach can `create_routine`,
  `update_routine`, `delete_routine`, `start_workout`, `log_set`, and ask you a
  multiple-choice question (`ask_choice`) when it needs to disambiguate — then
  confirms in words. Responses **stream token-by-token**, and a **live activity
  trace** shows each tool call + result as it happens (collapsible afterward).
- **📊 Readiness engine.** `computeReadiness()` blends estimated muscle recovery
  with a self-reported energy check (and a device sleep score when available) —
  a wearable-free daily readiness score with semantic color + guidance.
- **💪 Muscle recovery model.** Exercise→muscle mapping + per-group time-decay
  produces a recovery % per muscle group, driving both the coach and the home
  heatmap.
- **📈 Real progress.** Epley 1RM, all-time bests, automatic PR detection, and
  per-exercise volume series — computed from your logged sets, not mocked.
- **📝 Full routine editor & live workout.** Drag-reorder, accordions,
  supersets, rep-ranges, rest timers, bodyweight, plate calculator. The live
  session lives in the store, so it **survives an app restart (resume-workout)**
  and is shared with the coach.
- **👥 Community, profile, and a full settings surface** — one minimalist design
  system throughout, with direction-aware tab transitions.

## Tech stack

| Layer      | Choices |
|------------|---------|
| App        | React Native 0.86 · Expo SDK 57 · Expo Router (file-based) |
| Styling    | NativeWind / Tailwind v4 via `react-native-css` |
| State      | Zustand (+ `persist` over AsyncStorage) |
| Animation  | Reanimated 4 · Gesture Handler · SVG |
| AI         | OpenRouter (OpenAI-compatible), streamed tool-calling |
| Backend    | Node · Express · Supabase (Postgres/Auth) · MCP server |
| Tests / CI | `node:test` + `tsx` · GitHub Actions |

## Repository layout

```
.
├── mobile/                 # the Expo app (primary)
│   ├── src/
│   │   ├── app/            # Expo Router routes ((tabs), auth, routine, etc.)
│   │   ├── components/     # UI (ReadinessRing, SettingsPanel, community/…)
│   │   ├── lib/            # coach.ts, readiness.ts, recovery.ts, history.ts,
│   │   │                   # stats.ts, auth.ts, health.ts, supabase.ts
│   │   └── store/          # useAppStore.ts (Zustand)
│   └── test/              # unit tests (pure logic)
├── backend/                # optional: Express API + MCP server + Supabase schema
│   ├── index.js           # /api/agent/chat, /api/onboarding/next
│   ├── mcp-server.js      # MCP tools: fetch_workout_history, generate_workout_plan, …
│   └── schema.sql         # profiles / exercises / workouts / workout_exercises / sets
└── .github/workflows/ci.yml
```

---

## Getting started

### Prerequisites

- **Node 20+** (CI runs on 20; developed on 24)
- The **Expo Go** app or an iOS/Android simulator (or just run on web)

### 1. Run the app

```bash
cd mobile
npm install
npm run web        # or: npm run ios | npm run android | npm start
```

The app runs **fully local out of the box** — data persists to AsyncStorage, and
auth screens accept any input (local mode). No backend required to try it.

### 2. Enable the AI coach (recommended)

The coach needs an OpenRouter API key. Create `mobile/.env` (gitignored):

```bash
# mobile/.env
EXPO_PUBLIC_OPENROUTER_KEY=sk-or-v1-...      # https://openrouter.ai/keys
```

Default model: `nvidia/nemotron-3-ultra-550b-a55b:free` (free, tool-calling
capable). Users can also paste their own key in **Profile → Settings**.

### 3. (Optional) Real accounts + sync via Supabase

Auth uses Supabase when configured, and transparently falls back to local mode
when it isn't. To turn it on, create a project, run `backend/schema.sql`, and add:

```bash
# mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

`lib/auth.ts` detects real credentials (`hasSupabase()`) and switches
`signIn`/`signUp`/`signOut`/session-restore to real Supabase Auth automatically.

### 4. (Optional) Backend + MCP server

```bash
cd backend
npm install
node index.js          # Express API
node mcp-server.js      # MCP server (stdio) — exposes workout tools
```

---

## Testing

Pure-logic unit tests (readiness, recovery, 1RM/PR/volume, dashboard stats) run
with Node's built-in test runner + `tsx` — no native/RN stack needed:

```bash
cd mobile
npm test
```

**CI** (`.github/workflows/ci.yml`) runs `npm ci && npm test` on every push and
PR to `main`.

---

## Architecture notes

- **Local-first, sync-optional.** The Zustand store (persisted) is the source of
  truth. Supabase, when configured, layers real auth on top; DB sync is on the
  roadmap. Nothing breaks without a backend.
- **The coach is an agentic loop, not a chat wrapper.** `getCoachReply()` runs a
  bounded tool-calling loop: stream a turn → if the model emits `tool_calls`,
  execute them against the store and feed results back → repeat until it answers.
  Tool calls and streamed tokens are surfaced to the UI via `onProgress`/`onToken`.
- **Readiness without wearables.** Recovery is derived from your own logged
  volume + time decay; the daily score is designed to work with nothing but the
  app, and to *incorporate* a wearable sleep score if one ever shows up.

## Project status

| Area | State |
|------|-------|
| Client (all screens, coach, workouts, stats) | ✅ Working |
| Unit tests + CI | ✅ Green |
| Auth (Supabase, local fallback) | ✅ Code-complete — real once creds are set |
| Backend DB sync (routines/workouts/feed) | 🚧 Planned |
| Health (HealthKit / Health Connect) | 🚧 Stubbed — needs a device + EAS dev build |
| On-device verification (haptics, native transitions) | 🚧 Web-tested only |

## Roadmap

- [ ] Push local data to Supabase (multi-device sync, shared community feed)
- [ ] HealthKit / Health Connect reads wired into the readiness engine
- [ ] EAS dev build + on-device QA (haptics, gestures, transitions)
- [ ] Expand test coverage into store actions and the coach loop

## Contributing

Issues and PRs welcome. Please run `npm test` (in `mobile/`) before opening a PR;
match the existing minimalist design system and coding style. Keep secrets out of
git — API keys live only in the gitignored `mobile/.env`.

## License

[MIT](mobile/LICENSE).
