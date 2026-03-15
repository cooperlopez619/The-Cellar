-- ─── The Cellar — Supabase Schema ────────────────────────────────────────────
-- Safe to run multiple times.

-- ─── whiskeys ─────────────────────────────────────────────────────────────────
create table if not exists public.whiskeys (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  distillery  text not null,
  type        text not null check (type in ('Bourbon','Scotch','Japanese','Irish','Rye')),
  region      text,
  abv         numeric(4,1),
  price_tier  text check (price_tier in ('Budget','Mid','Premium','Luxury','Unicorn')),
  is_custom   boolean default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

alter table public.whiskeys enable row level security;

drop policy if exists "whiskeys_select" on public.whiskeys;
drop policy if exists "whiskeys_insert" on public.whiskeys;

create policy "whiskeys_select" on public.whiskeys
  for select using (auth.role() = 'authenticated');

create policy "whiskeys_insert" on public.whiskeys
  for insert with check (auth.uid() = created_by and is_custom = true);

-- ─── pours ────────────────────────────────────────────────────────────────────
create table if not exists public.pours (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null,
  whiskey_id           uuid references public.whiskeys(id) on delete cascade not null,
  scores               jsonb not null default '{}',
  master_score         numeric(3,2),
  bfb_score            numeric(4,2),
  tasting_notes        text,
  price_tier_override  text check (price_tier_override in ('Budget','Mid','Premium','Luxury','Unicorn')),
  created_at           timestamptz default now()
);

alter table public.pours enable row level security;

drop policy if exists "pours_select" on public.pours;
drop policy if exists "pours_insert" on public.pours;
drop policy if exists "pours_delete" on public.pours;

create policy "pours_select" on public.pours
  for select using (auth.uid() = user_id);

create policy "pours_insert" on public.pours
  for insert with check (auth.uid() = user_id);

create policy "pours_delete" on public.pours
  for delete using (auth.uid() = user_id);
