-- ============================================================
-- Migration: Contratos y sueldos
-- Cada temporada se cobra a cada club el sueldo de sus jugadores
-- (un % del precio fijo según el nivel). Cuando un contrato llega a
-- su fin se cobra la renovación; si el club no puede pagar, el
-- jugador queda libre.
-- ============================================================

-- Temporadas que le quedan al contrato. NULL = contrato completo de su
-- nivel empezando ahora (así quedan los jugadores actuales y los fichajes).
alter table public.players
  add column if not exists contract_seasons_left integer check (contract_seasons_left >= 0);

-- Sueldo por temporada de cada nivel, en % del precio fijo (editable por liga).
create table if not exists public.contract_salaries (
  league_id   uuid not null references public.leagues(id) on delete cascade,
  tier        text not null check (tier in ('S+', 'S', 'A', 'B', 'C', 'D')),
  percent     numeric(5,2) not null default 0 check (percent >= 0 and percent <= 100),
  updated_at  timestamptz not null default now(),
  primary key (league_id, tier)
);

alter table public.contract_salaries enable row level security;
create policy "Allow all contract_salaries (mvp)" on public.contract_salaries
  for all using (true) with check (true);

-- Cierres de temporada ya aplicados: evita cobrar dos veces si se
-- corrige un resultado después de acabar la liga. calendar_key identifica
-- el calendario (cambia al regenerarlo para una temporada nueva).
create table if not exists public.season_closures (
  league_id     uuid not null references public.leagues(id) on delete cascade,
  calendar_key  text not null,
  stage         text not null check (stage in ('mid', 'end', 'contracts')),
  created_at    timestamptz not null default now(),
  primary key (league_id, calendar_key, stage)
);

alter table public.season_closures enable row level security;
create policy "Allow all season_closures (mvp)" on public.season_closures
  for all using (true) with check (true);

-- Historial de cobros de contratos.
create table if not exists public.contract_events (
  id            uuid primary key default gen_random_uuid(),
  league_id     uuid not null references public.leagues(id) on delete cascade,
  calendar_key  text not null,
  team_id       uuid references public.teams(id) on delete set null,
  player_id     uuid references public.players(id) on delete set null,
  player_name   text not null,
  team_name     text not null,
  kind          text not null check (kind in ('salary', 'renewal', 'released')),
  amount        bigint not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists contract_events_league_idx on public.contract_events(league_id, created_at desc);

alter table public.contract_events enable row level security;
create policy "Allow all contract_events (mvp)" on public.contract_events
  for all using (true) with check (true);
