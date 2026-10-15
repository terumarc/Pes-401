-- ============================================================
-- Migration: temporadas, goleadores, copas y ofertas entre clubes
-- ============================================================

-- Cada partido de liga pertenece a una temporada (leagues.season).
-- Al empezar una temporada nueva, los partidos anteriores se conservan
-- para el historial entre clubes y las estadísticas.
alter table public.matches add column if not exists season text;
update public.matches m set season = l.season from public.leagues l where m.league_id = l.id and m.season is null;
create index if not exists matches_league_season_idx on public.matches(league_id, season);

-- Goles de cada partido (liga o copa): quién marcó y cuántos.
create table if not exists public.match_goals (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  season       text not null,
  match_id     uuid references public.matches(id) on delete cascade,
  cup_tie_id   uuid,
  leg          smallint,
  team_id      uuid not null references public.teams(id) on delete cascade,
  player_id    uuid references public.players(id) on delete set null,
  player_name  text not null,
  goals        smallint not null default 1 check (goals > 0),
  created_at   timestamptz not null default now()
);
create index if not exists match_goals_match_idx on public.match_goals(match_id);
create index if not exists match_goals_season_idx on public.match_goals(league_id, season);
alter table public.match_goals enable row level security;
create policy "Allow all match_goals (mvp)" on public.match_goals for all using (true) with check (true);

-- Copas (Champions, Copa de Liga, Conference): cruces de eliminatoria.
-- round = 1 es la primera ronda; la final es la última y se juega a un partido.
create table if not exists public.cup_ties (
  id                 uuid primary key default gen_random_uuid(),
  league_id          uuid not null references public.leagues(id) on delete cascade,
  season             text not null,
  trophy             text not null check (trophy in ('champions', 'cup', 'conference')),
  round              smallint not null,
  slot               smallint not null,
  is_final           boolean not null default false,
  home_team_id       uuid references public.teams(id) on delete cascade,
  away_team_id       uuid references public.teams(id) on delete cascade,
  leg1_home_goals    smallint,
  leg1_away_goals    smallint,
  leg2_home_goals    smallint,
  leg2_away_goals    smallint,
  penalty_winner_id  uuid references public.teams(id) on delete set null,
  winner_team_id     uuid references public.teams(id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (league_id, season, trophy, round, slot)
);
create index if not exists cup_ties_league_season_idx on public.cup_ties(league_id, season, trophy);
alter table public.cup_ties enable row level security;
create policy "Allow all cup_ties (mvp)" on public.cup_ties for all using (true) with check (true);

-- Temporadas cerradas: clasificación final, campeones y pichichi.
create table if not exists public.seasons (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  season       text not null,
  standings    jsonb not null default '[]'::jsonb,
  champions    jsonb not null default '{}'::jsonb,
  top_scorers  jsonb not null default '[]'::jsonb,
  closed_at    timestamptz not null default now(),
  unique (league_id, season)
);
alter table public.seasons enable row level security;
create policy "Allow all seasons (mvp)" on public.seasons for all using (true) with check (true);

-- Ofertas entre clubes: dinero y, si se quiere, un jugador a cambio.
create table if not exists public.transfer_offers (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues(id) on delete cascade,
  player_id        uuid not null references public.players(id) on delete cascade,
  buyer_team_id    uuid not null references public.teams(id) on delete cascade,
  seller_team_id   uuid not null references public.teams(id) on delete cascade,
  amount           bigint not null default 0 check (amount >= 0),
  swap_player_id   uuid references public.players(id) on delete set null,
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);
create index if not exists transfer_offers_status_idx on public.transfer_offers(league_id, status);
alter table public.transfer_offers enable row level security;
create policy "Allow all transfer_offers (mvp)" on public.transfer_offers for all using (true) with check (true);
