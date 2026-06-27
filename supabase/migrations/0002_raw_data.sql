-- PulseBoard raw ingestion tables. The Upload Centre writes normalised rows here;
-- the recompute step rolls them up into the dashboard's metric tables
-- (skus, sku_metrics, cities, daily_metrics). Run after 0001_init.sql.

create extension if not exists "pgcrypto";

-- ── Raw sales (SKU × city × platform × period) ───────────────
create table if not exists public.sales_records (
  id         uuid primary key default gen_random_uuid(),
  upload_id  uuid references public.uploads (id) on delete set null,
  platform   text not null,            -- 'Big Basket' | 'Instamart' | 'Blinkit' | …
  city       text not null,
  sku_name   text not null,            -- as it appears in the export
  sku_id     text,                     -- resolved/slugified id
  revenue    numeric not null default 0,
  units      numeric,
  period     text not null default 'P1', -- reporting period label; 2+ periods unlock trend
  created_at timestamptz not null default now()
);
create index if not exists sales_records_sku_idx on public.sales_records (sku_id);
create index if not exists sales_records_city_idx on public.sales_records (city);

-- ── Raw spends (platform × day) ──────────────────────────────
create table if not exists public.spend_records (
  id         uuid primary key default gen_random_uuid(),
  upload_id  uuid references public.uploads (id) on delete set null,
  platform   text not null,
  day        date not null,
  spend      numeric not null default 0,
  sales      numeric not null default 0,
  a2s        numeric,                  -- if absent, derived as spend/sales
  created_at timestamptz not null default now()
);
create index if not exists spend_records_day_idx on public.spend_records (day);

-- ── Raw distribution points (city × platform × period) ───────
create table if not exists public.pod_records (
  id         uuid primary key default gen_random_uuid(),
  upload_id  uuid references public.uploads (id) on delete set null,
  platform   text not null,
  city       text not null,
  period     text not null default 'P1',
  pod_count  integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pod_records_city_idx on public.pod_records (city);

-- ── RLS: authenticated users may read + write raw rows ───────
alter table public.sales_records enable row level security;
alter table public.spend_records enable row level security;
alter table public.pod_records   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sales_records','spend_records','pod_records']
  loop
    execute format('drop policy if exists "%s_rw" on public.%I;', t, t);
    execute format(
      'create policy "%s_rw" on public.%I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

-- Allow authenticated users to (re)write the derived metric tables during recompute.
do $$
declare t text;
begin
  foreach t in array array['skus','sku_metrics','cities','daily_metrics']
  loop
    execute format('drop policy if exists "%s_write" on public.%I;', t, t);
    execute format(
      'create policy "%s_write" on public.%I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;
