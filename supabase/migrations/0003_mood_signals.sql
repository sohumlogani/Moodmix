-- Stores the latest Mood-Map agent run so a scheduled job can refresh it in the
-- background and the app shows fresh customer-voice data instantly on open.
-- Single-row snapshot (id is pinned to 1).
create table if not exists public.mood_signals (
  id           integer primary key default 1,
  data         jsonb not null,
  refreshed_at timestamptz not null default now(),
  constraint mood_signals_singleton check (id = 1)
);

alter table public.mood_signals enable row level security;

drop policy if exists "mood_signals_read" on public.mood_signals;
create policy "mood_signals_read" on public.mood_signals
  for select to authenticated using (true);

drop policy if exists "mood_signals_write" on public.mood_signals;
create policy "mood_signals_write" on public.mood_signals
  for all to authenticated using (true) with check (true);
