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
2. Open **SQL Editor** → run the migrations in order:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, `profiles` trigger, RLS.
   - [`supabase/migrations/0002_raw_data.sql`](supabase/migrations/0002_raw_data.sql) — raw ingestion tables (`sales_records`, `spend_records`, `pod_records`) for the Upload Centre.
   - [`supabase/migrations/0003_mood_signals.sql`](supabase/migrations/0003_mood_signals.sql) — stores the latest Mood-Map agent run (for the always-on agents).
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

## 5b. Upload real data (Upload Centre)

This is how seed data becomes **your** data. There is no public API for Blinkit /
BigBasket / Instamart sales — you export from each **seller/brand portal** (CSV/XLSX)
and upload it here.

1. Sign in, go to **Upload** in the sidebar.
2. Pick the dataset type: **SKU Sales**, **Sales vs Spends**, or **POD Availability**.
   (Click *Download template* to see the exact columns — your export's headers are
   auto-detected and you can remap any field.)
3. Drop the file → review the column mapping + preview → **Import & recompute**.

On import, rows are normalised into `sales_records` / `spend_records` / `pod_records`,
then [`src/lib/ingest.ts`](src/lib/ingest.ts) **recomputes every dashboard metric**
(revenue, A2S, platform split, velocity, city opportunity, SKU health) and the UI
refreshes. Upload all three types for a complete picture; trend needs **2+ periods**.

> When you obtain a platform **partner/marketplace API** (Blinkit/Zepto/Swiggy grant
> these to brands), we can replace the manual upload with an auto-connector that writes
> the same `*_records` tables on a schedule.

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

---

## 7b. Deploy the AI signal agents (Reddit, Google Reviews, Trends, Discord, YouTube)

The agents live in [`src/lib/signals-core.ts`](src/lib/signals-core.ts). **Each source shows
"Sample" data until you add its key, then flips to "Live".** Real Google reviews come with a
**Verify on Google** link on every review.

### Step 1 — get the keys (add to `.env`)

| Key | Source | Powers | Cost |
|---|---|---|---|
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | reddit.com/prefs/apps → create a **script** app | Reddit buzz | Free |
| `SERPAPI_KEY` + `GOOGLE_PLACE_ID` | [serpapi.com](https://serpapi.com) + your Google Business listing's Place ID | **Real Google Reviews (with links)** + Trends | Free tier |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console | Reviews fallback (max 5) | Free tier |
| `YOUTUBE_API_KEY` | Google Cloud → YouTube Data API v3 | YouTube buzz | Free |
| `DISCORD_BOT_TOKEN` + `DISCORD_CHANNEL_ID` | discord.com/developers (bot must be in the server) | Discord chatter | Free |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Summary + real-vs-junk review classification | Anthropic |

> Finding your `GOOGLE_PLACE_ID`: search your business at
> [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id), or it comes back from a SerpAPI place search.

### Step 2 — run them

- **On demand:** just open the **Mood Map** (or click **Run signal agents**). With keys set,
  each source is **Live**; the run is saved to Supabase (`mood_signals`).
- **Always-on (recommended):** run them on a schedule so the app is always fresh:

  ```bash
  bun run agents     # collects + writes the snapshot to Supabase
  ```

  Schedule it with the included GitHub Action — [`.github/workflows/agents.yml`](.github/workflows/agents.yml)
  runs every 6 hours. Add your keys as **repo secrets** (Settings → Secrets and variables →
  Actions), and it'll keep the Mood Map fresh with zero clicks. (Any cron host works — it just
  runs `bun run agents`.)

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
