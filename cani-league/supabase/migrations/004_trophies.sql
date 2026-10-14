-- ============================================================
-- Migration: Sala de trofeos (palmarés por equipo)
-- Una fila por equipo y competición con el número de títulos.
-- ============================================================
create table if not exists public.team_trophies (
  team_id     uuid not null references public.teams(id) on delete cascade,
  trophy      text not null check (trophy in ('league', 'champions', 'cup', 'conference')),
  count       integer not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  primary key (team_id, trophy)
);

create index if not exists team_trophies_team_id_idx on public.team_trophies(team_id);

-- RLS (mismo criterio que el resto de tablas del MVP)
alter table public.team_trophies enable row level security;
create policy "Allow all team_trophies (mvp)" on public.team_trophies
  for all using (true) with check (true);

-- ============================================================
-- Premio en metálico por título (editable por liga).
-- Al sumar un título, el premio se añade al presupuesto del club;
-- al quitarlo, se descuenta.
-- ============================================================
create table if not exists public.trophy_prizes (
  league_id   uuid not null references public.leagues(id) on delete cascade,
  trophy      text not null check (trophy in ('league', 'champions', 'cup', 'conference')),
  prize       integer not null default 0 check (prize >= 0),
  updated_at  timestamptz not null default now(),
  primary key (league_id, trophy)
);

alter table public.trophy_prizes enable row level security;
create policy "Allow all trophy_prizes (mvp)" on public.trophy_prizes
  for all using (true) with check (true);
