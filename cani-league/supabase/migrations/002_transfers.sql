-- ============================================================
-- Migration: Create transfers table for tracking transfer history
-- ============================================================
create table if not exists public.transfers (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references public.leagues(id) on delete cascade,
  player_id       uuid not null references public.players(id) on delete cascade,
  player_name     text not null,
  from_team_id    uuid not null references public.teams(id) on delete cascade,
  from_team_name  text not null,
  to_team_id      uuid not null references public.teams(id) on delete cascade,
  to_team_name    text not null,
  fee             integer not null check (fee >= 0),
  transferred_at  timestamptz not null default now()
);

create index if not exists transfers_league_id_idx on public.transfers(league_id);
create index if not exists transfers_player_id_idx on public.transfers(player_id);
create index if not exists transfers_from_team_idx on public.transfers(from_team_id);
create index if not exists transfers_to_team_idx   on public.transfers(to_team_id);

-- RLS
alter table public.transfers enable row level security;
create policy "Allow all transfers (mvp)" on public.transfers
  for all using (true) with check (true);
