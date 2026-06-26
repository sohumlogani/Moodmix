-- PulseBoard — MadMix Demand Intelligence
-- Full schema: reference data, computed metrics, mood-map signals, and user profiles.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY guards.

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Profiles (one row per auth user) — role-based access (owner / ops)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'owner' check (role in ('owner', 'ops')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- SKUs (flavour master)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.skus (
  id        text primary key,
  name      text not null,
  short     text not null,
  category  text not null,
  size      text not null
);

-- Per-SKU computed metrics (one row per SKU per reporting period)
create table if not exists public.sku_metrics (
  sku_id    text primary key references public.skus (id) on delete cascade,
  revenue   numeric not null default 0,
  bb_share  numeric not null default 0,
  trend     numeric not null default 0,
  cities    integer not null default 0,
  a2s       numeric not null default 0,
  health    integer not null default 0,
  tag       text not null default 'Growing'
);

-- ─────────────────────────────────────────────────────────────
-- Cities (distribution + revenue)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cities (
  name        text primary key,
  revenue     numeric not null default 0,
  bb_rev      numeric not null default 0,
  insta_rev   numeric not null default 0,
  pods        integer not null default 0,
  pods_prev   integer not null default 0,
  opportunity integer not null default 0
);

-- ─────────────────────────────────────────────────────────────
-- Daily metrics (sales + spend + A2S per platform per day)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.daily_metrics (
  full_date    date primary key,
  label        text not null,            -- MM-DD label for charts
  bb_sales     numeric not null default 0,
  bb_spend     numeric not null default 0,
  bb_a2s       numeric not null default 0,
  insta_sales  numeric not null default 0,
  insta_spend  numeric not null default 0,
  insta_a2s    numeric not null default 0
);

-- ─────────────────────────────────────────────────────────────
-- Mood Map — AI synthesis output
-- ─────────────────────────────────────────────────────────────
create table if not exists public.mood_opportunities (
  id              integer primary key,
  city            text not null,
  event           text not null,
  weeks           integer not null default 0,
  event_date      text,
  sku             text,
  score           integer not null default 0,
  sources         text[] not null default '{}',
  note            text,
  refreshed_at    timestamptz not null default now()
);

create table if not exists public.demand_gaps (
  id       integer primary key,
  city     text not null,
  insight  text not null
);

create table if not exists public.season_calendar (
  id         integer primary key,
  season     text not null,
  window     text not null,
  sku        text not null,
  cities     text[] not null default '{}',
  lead_time  text not null
);

create table if not exists public.city_buzz (
  city  text primary key,
  x     numeric not null,
  y     numeric not null,
  buzz  integer not null default 0
);

-- ─────────────────────────────────────────────────────────────
-- Settings (per user — alert thresholds & toggles)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  a2s_threshold  numeric not null default 0.5,
  alert_a2s      boolean not null default true,
  alert_opps     boolean not null default true,
  alert_pods     boolean not null default false,
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Uploads (audit log of xlsx exports loaded by ops)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.uploads (
  id           uuid primary key default gen_random_uuid(),
  uploaded_by  uuid references auth.users (id) on delete set null,
  file_name    text not null,
  status       text not null default 'processed',
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.skus                enable row level security;
alter table public.sku_metrics         enable row level security;
alter table public.cities              enable row level security;
alter table public.daily_metrics       enable row level security;
alter table public.mood_opportunities  enable row level security;
alter table public.demand_gaps         enable row level security;
alter table public.season_calendar     enable row level security;
alter table public.city_buzz           enable row level security;
alter table public.settings            enable row level security;
alter table public.uploads             enable row level security;

-- Profiles: a user can read/update only their own profile.
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- Shared reference + metric tables: any authenticated user may read.
do $$
declare t text;
begin
  foreach t in array array[
    'skus','sku_metrics','cities','daily_metrics',
    'mood_opportunities','demand_gaps','season_calendar','city_buzz'
  ]
  loop
    execute format('drop policy if exists "%s_read" on public.%I;', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select to authenticated using (true);',
      t, t
    );
  end loop;
end $$;

-- Mood Map: authenticated users may refresh (write) the synthesis tables.
do $$
declare t text;
begin
  foreach t in array array['mood_opportunities','demand_gaps','season_calendar','city_buzz']
  loop
    execute format('drop policy if exists "%s_write" on public.%I;', t, t);
    execute format(
      'create policy "%s_write" on public.%I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

-- Settings: a user owns only their own settings row.
drop policy if exists "settings_own" on public.settings;
create policy "settings_own" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Uploads: authenticated users may read the log and insert their own rows.
drop policy if exists "uploads_read" on public.uploads;
create policy "uploads_read" on public.uploads
  for select to authenticated using (true);
drop policy if exists "uploads_insert" on public.uploads;
create policy "uploads_insert" on public.uploads
  for insert to authenticated with check (auth.uid() = uploaded_by);
