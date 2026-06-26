# PulseBoard — Setup & Run Guide

MadMix demand-intelligence command centre. React 19 + TanStack Start (SSR) on the
front, **Supabase** (Postgres + Auth) for the backend, and **Claude** (`claude-opus-4-8`)
powering the Mood Map.

> **Works out of the box.** With no keys set, the app runs in **demo mode** against a
> bundled dataset — no login, no database needed. Add the keys below to unlock real
> auth, a live database, and the AI Mood Map.

---

## 1. Prerequisites

- [Bun](https://bun.sh) (preferred — the repo uses `bun.lock`) **or** Node 18+ with npm
- A free [Supabase](https://supabase.com) project (for auth + database)
- An [Anthropic API key](https://console.anthropic.com) (optional — for the AI Mood Map)

---

## 2. Install

```bash
bun install
# or: npm install
```

---

## 3. Configure environment

```bash
cp .env.example .env
```

Then fill in `.env` (see the **API keys** table below). Bun and Vite load `.env`
automatically. `VITE_*` vars reach the browser; everything else stays server-side.

---

## 4. Set up the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.
   This creates every table, the `profiles` auto-trigger, and Row Level Security policies.
3. Grab your keys from **Project Settings → API** and put them in `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

### Seed the data

```bash
bun run seed
```

This loads all SKUs, cities, daily metrics and Mood Map signals into your project
(idempotent — safe to re-run). Uses the **service role** key, so it bypasses RLS.

---

## 5. Run

```bash
bun run dev        # http://localhost:8080
```

Production build / preview:

```bash
bun run build
bun run preview
```

---

## 6. First sign-in

- **Demo mode** (no Supabase keys): click **Enter Dashboard**.
- **With Supabase**: the login screen shows email/password. Click **Create one**,
  sign up, then sign in. A `profiles` row is created automatically.
  - Email confirmation is on by default in Supabase. To skip it while developing:
    **Authentication → Providers → Email → disable "Confirm email"**.

---

## 7. API keys — what each one does

| Key (in `.env`) | Required? | Where to get it | What it powers |
|---|---|---|---|
| `VITE_SUPABASE_URL` | For live data/auth | Supabase → Settings → API | DB + auth endpoint (browser) |
| `VITE_SUPABASE_ANON_KEY` | For live data/auth | Supabase → Settings → API | Browser DB access (RLS-guarded) |
| `SUPABASE_URL` | For seeding | Same as above | Used by `bun run seed` |
| `SUPABASE_SERVICE_ROLE_KEY` | For seeding | Supabase → Settings → API (`service_role`) | Server-side seed (bypasses RLS) — **never expose to the browser** |
| `ANTHROPIC_API_KEY` | Optional | [console.anthropic.com](https://console.anthropic.com) → API Keys | AI Mood Map synthesis (`claude-opus-4-8`). Without it, "Refresh Mood Map" uses a local fallback. |

### Optional — live signal sources for a production Mood Map

The Mood Map currently synthesises opportunities from your own SKUs + cities. To wire in
real public signals (as in the product plan), add these and extend
[`src/lib/moodmap.ts`](src/lib/moodmap.ts):

| Key | Source | Used for |
|---|---|---|
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | reddit.com/prefs/apps | Social buzz signals |
| `YOUTUBE_API_KEY` | Google Cloud Console | Event / concert discovery |
| `APIFY_TOKEN` | apify.com | BookMyShow event scraping |

---

## 8. How it fits together

```
Browser (React 19 / TanStack Start, SSR)
  │
  ├─ AuthProvider ............ Supabase Auth (email/password, session)
  ├─ PulseDataProvider ....... loads all datasets once (React Query), bundled
  │                            fallback = instant tabs, zero flash
  │                              └─ fetchPulseData() → Supabase tables
  └─ Mood Map "Refresh" ...... createServerFn (server-only RPC)
                                 └─ Claude claude-opus-4-8 → JSON opportunities
                                 └─ persisted back to Supabase
```

- **Schema & RLS:** `supabase/migrations/0001_init.sql`
- **Seed:** `scripts/seed.ts` (`bun run seed`)
- **Types:** `src/lib/types.ts` · **Data fetch:** `src/lib/pulse-queries.ts`
- **AI:** `src/lib/moodmap.ts` (server function; `@anthropic-ai/sdk`, server-only)

---

## 9. Notes

- **Tailwind only.** All styling is Tailwind v4 utilities + design tokens in
  `src/styles.css` (`@theme`). No other CSS framework.
- **No-lag tabs.** Route code is preloaded on hover (`defaultPreload: "intent"`) and the
  full dataset is cached in one query with a bundled initial value, so switching tabs is
  instant. Page transitions are a 180ms fade/slide via Framer Motion.
- **Security.** The service-role key is used only by the seed script. The browser only
  ever sees the anon key, and every table is protected by RLS.
