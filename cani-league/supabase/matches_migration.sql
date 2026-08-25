-- ============================================================
-- Tabla: matches
-- Liga de 7 equipos, ida y vuelta (2 rondas × 21 partidos = 42 total)
-- ============================================================
create table if not exists matches (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references leagues(id) on delete cascade,
  home_team_id  uuid not null references teams(id) on delete cascade,
  away_team_id  uuid not null references teams(id) on delete cascade,
  matchday      int  not null,           -- jornada (1-12 para 7 equipos)
  round         int  not null default 1, -- 1 = ida, 2 = vuelta
  home_goals    int  null,
  away_goals    int  null,
  played        boolean not null default false,
  played_at     timestamptz null,
  created_at    timestamptz not null default now(),

  constraint different_teams check (home_team_id <> away_team_id)
);

-- Índices útiles
create index if not exists matches_league_id_idx    on matches(league_id);
create index if not exists matches_matchday_idx     on matches(league_id, matchday);
create index if not exists matches_home_team_idx    on matches(home_team_id);
create index if not exists matches_away_team_idx    on matches(away_team_id);

-- RLS (ajusta según tu política de seguridad)
alter table matches enable row level security;
create policy "Permitir lectura pública" on matches for select using (true);
create policy "Permitir escritura autenticada" on matches for all using (auth.role() = 'authenticated');
