/**
 * Seed Supabase with the PulseBoard dataset.
 *
 *   1. Create a Supabase project and run supabase/migrations/0001_init.sql
 *   2. Put SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env  (service role bypasses RLS)
 *   3. bun run seed
 *
 * Idempotent — re-running upserts the same rows.
 */
import { createClient } from "@supabase/supabase-js";
import {
  skus,
  skuMetrics,
  cities,
  dailyMetrics,
  moodMapOpportunities,
  demandGaps,
  seasonCalendar,
  cityBuzz,
} from "../src/data/mockData";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env), then re-run.",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function upsert(table: string, rows: Record<string, unknown>[], onConflict: string) {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`);
    throw error;
  }
  console.log(`  ✓ ${table} (${rows.length} rows)`);
}

async function main() {
  console.log("Seeding PulseBoard →", url);

  await upsert("skus", skus, "id");

  await upsert(
    "sku_metrics",
    Object.entries(skuMetrics).map(([sku_id, m]) => ({
      sku_id,
      revenue: m.revenue,
      bb_share: m.bbShare,
      trend: m.trend,
      cities: m.cities,
      a2s: m.a2s,
      health: m.health,
      tag: m.tag,
    })),
    "sku_id",
  );

  await upsert(
    "cities",
    cities.map((c) => ({
      name: c.name,
      revenue: c.revenue,
      bb_rev: c.bbRev,
      insta_rev: c.instaRev,
      pods: c.pods,
      pods_prev: c.podsPrev,
      opportunity: c.opportunity,
    })),
    "name",
  );

  await upsert(
    "daily_metrics",
    dailyMetrics.map((d) => ({
      full_date: d.fullDate,
      label: d.date,
      bb_sales: d.bbSales,
      bb_spend: d.bbSpend,
      bb_a2s: d.bbA2s,
      insta_sales: d.instaSales,
      insta_spend: d.instaSpend,
      insta_a2s: d.instaA2s,
    })),
    "full_date",
  );

  await upsert(
    "mood_opportunities",
    moodMapOpportunities.map((o) => ({
      id: o.id,
      city: o.city,
      event: o.event,
      weeks: o.weeks,
      event_date: o.date,
      sku: o.sku,
      score: o.score,
      sources: o.sources,
      note: o.note,
    })),
    "id",
  );

  await upsert(
    "demand_gaps",
    demandGaps.map((g, i) => ({ id: i + 1, city: g.city, insight: g.insight })),
    "id",
  );

  await upsert(
    "season_calendar",
    seasonCalendar.map((s, i) => ({
      id: i + 1,
      season: s.season,
      window: s.window,
      sku: s.sku,
      cities: s.cities,
      lead_time: s.leadTime,
    })),
    "id",
  );

  await upsert(
    "city_buzz",
    cityBuzz.map((c) => ({ city: c.city, x: c.x, y: c.y, buzz: c.buzz })),
    "city",
  );

  console.log("\nDone. PulseBoard is seeded ✨");
}

main().catch(() => process.exit(1));
