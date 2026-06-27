/**
 * Standalone Mood-Map agent runner — the "always-on" deployment.
 *
 * Runs the same collectors as the app (Reddit, Google Reviews, Trends, Discord,
 * YouTube + Claude) and writes the snapshot to Supabase, so the app shows fresh
 * customer-voice data without anyone clicking. Schedule it (GitHub Actions cron,
 * any cron host, etc.) — see SETUP.md.
 *
 *   bun run agents      (or: bun run scripts/run-agents.ts)
 *
 * Needs in env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, plus whichever signal
 * keys you want live (SERPAPI_KEY, GOOGLE_PLACE_ID, REDDIT_*, YOUTUBE_API_KEY,
 * DISCORD_*, ANTHROPIC_API_KEY).
 */
import { createClient } from "@supabase/supabase-js";
import { runAgents } from "../src/lib/signals-core";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

async function main() {
  console.log("Running Mood-Map signal agents…");
  const result = await runAgents();

  const liveSources = Object.entries(result.live)
    .filter(([, v]) => v)
    .map(([k]) => k);
  console.log(
    `  collected: ${result.reviews.length} reviews, ${result.reddit.length} reddit, ${result.trends.length} trends, ${result.discord.length} discord, ${result.youtube.length} youtube`,
  );
  console.log(`  live sources: ${liveSources.length ? liveSources.join(", ") : "none (all sample — add keys)"}`);

  const db = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const { error } = await db.from("mood_signals").upsert({ id: 1, data: result, refreshed_at: new Date().toISOString() });
  if (error) {
    console.error("  ✗ failed to persist:", error.message);
    process.exit(1);
  }
  console.log("  ✓ snapshot saved to Supabase. Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
