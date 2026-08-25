-- Cani League MVP schema
-- Designed for future: seasons history, matches, transfers, contracts, PES export

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- LEAGUES
-- ---------------------------------------------------------------------------
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TEAMS
-- Number of teams is data-driven (never hardcoded in app logic)
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  name text not null,
  short_name text not null,
  owner_name text,
  logo_url text,
  primary_color text not null default '#1B6B4A',
  secondary_color text not null default '#0C1222',
  budget integer not null default 100000000 check (budget >= 0),
  created_at timestamptz not null default now()
);

create index if not exists teams_league_id_idx on public.teams (league_id);

-- ---------------------------------------------------------------------------
-- PLAYERS
-- Stats are nullable (0-100 when present). Market flag enables transfer UI later.
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  short_name text,
  photo_url text,
  position text not null,
  age integer check (age is null or (age >= 15 and age <= 50)),
  nationality text,
  overall integer check (overall is null or (overall >= 0 and overall <= 100)),
  speed integer check (speed is null or (speed >= 0 and speed <= 100)),
  acceleration integer check (acceleration is null or (acceleration >= 0 and acceleration <= 100)),
  shooting integer check (shooting is null or (shooting >= 0 and shooting <= 100)),
  passing integer check (passing is null or (passing >= 0 and passing <= 100)),
  dribbling integer check (dribbling is null or (dribbling >= 0 and dribbling <= 100)),
  defending integer check (defending is null or (defending >= 0 and defending <= 100)),
  physical integer check (physical is null or (physical >= 0 and physical <= 100)),
  market_value integer not null default 0 check (market_value >= 0),
  transfer_price integer not null default 0 check (transfer_price >= 0),
  available_in_market boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists players_available_in_market_idx on public.players (available_in_market)
  where available_in_market = true;

-- ---------------------------------------------------------------------------
-- LEAGUE_STANDINGS
-- Manual positions for MVP; ready for auto calc from matches later
-- ---------------------------------------------------------------------------
create table if not exists public.league_standings (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position integer not null check (position >= 1),
  previous_position integer check (previous_position is null or previous_position >= 1),
  unique (league_id, team_id),
  unique (league_id, position)
);

create index if not exists league_standings_league_id_idx on public.league_standings (league_id);

-- ---------------------------------------------------------------------------
-- RLS (open for anon until auth is added; structure ready for policies)
-- ---------------------------------------------------------------------------
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.league_standings enable row level security;

create policy "Allow all leagues (mvp)" on public.leagues
  for all using (true) with check (true);

create policy "Allow all teams (mvp)" on public.teams
  for all using (true) with check (true);

create policy "Allow all players (mvp)" on public.players
  for all using (true) with check (true);

create policy "Allow all standings (mvp)" on public.league_standings
  for all using (true) with check (true);
