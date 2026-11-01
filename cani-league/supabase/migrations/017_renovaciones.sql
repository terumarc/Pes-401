-- 017 · Sin sueldos: solo renovaciones, a mano
--
-- · Cada jugador cumple un año de contrato en el mercado en el que fichó:
--   si llegó en el mercado de invierno, en cada mercado de invierno; si no, en
--   cada mercado de inicio de temporada (al acabar la liga).
-- · Cuando el contrato llega a 0, el club decide si lo renueva (paga el % de
--   renovación de su nivel). No se cobra nada solo.
-- · El % de renovación de cada nivel se edita en Finanzas.
-- Solo añade cosas: la app de antes sigue funcionando.

-- En qué mercado cumple años el contrato (null = inicio de temporada).
alter table public.players
  add column if not exists contract_anchor text check (contract_anchor in ('summer', 'winter'));

-- ¿Está abierto el mercado de invierno en esa liga? (ida acabada, vuelta sin empezar)
create or replace function public.is_winter_window(p_league uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with s as (select season from public.leagues where id = p_league),
  m as (
    select round, played from public.matches
     where league_id = p_league and season is not distinct from (select season from s)
  )
  select exists (select 1 from m where round = 1)
     and not exists (select 1 from m where round = 1 and not played)
     and not exists (select 1 from m where round = 2 and played);
$$;

-- Al cambiar de club: contrato nuevo y completo, que cumple años en el mercado en el que llega.
create or replace function public.players_track_joined_team()
returns trigger language plpgsql as $$
declare
  v_league uuid;
begin
  if tg_op = 'INSERT' or new.team_id is distinct from old.team_id then
    new.joined_team_at := now();
    if tg_op = 'UPDATE' then
      select league_id into v_league from public.teams where id = new.team_id;
      new.contract_anchor := case when v_league is not null and public.is_winter_window(v_league) then 'winter' else 'summer' end;
      new.contract_seasons_left := null;
    end if;
  end if;
  return new;
end $$;

-- % de renovación por nivel (editable en Finanzas).
create table if not exists public.contract_renewals (
  league_id   uuid not null references public.leagues(id) on delete cascade,
  tier        text not null check (tier in ('S+', 'S', 'A', 'B', 'C', 'D')),
  percent     numeric(5,2) not null default 0 check (percent >= 0 and percent <= 100),
  updated_at  timestamptz not null default now(),
  primary key (league_id, tier)
);
alter table public.contract_renewals enable row level security;
drop policy if exists "lectura" on public.contract_renewals;
create policy "lectura" on public.contract_renewals for select to anon, authenticated using (true);
drop policy if exists "admins: editar" on public.contract_renewals;
create policy "admins: editar" on public.contract_renewals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.contract_renewals (league_id, tier, percent)
select l.id, t.tier, t.pct
  from public.leagues l
 cross join (values ('S+', 50), ('S', 40), ('A', 25), ('B', 5), ('C', 0), ('D', 0)) as t(tier, pct)
on conflict do nothing;

-- Cumplir años de contrato: una vez por calendario y mercado.
alter table public.season_closures drop constraint if exists season_closures_stage_check;
alter table public.season_closures add constraint season_closures_stage_check
  check (stage in ('mid', 'end', 'contracts', 'tick_winter', 'tick_summer'));

-- Contrato acabado: queda en el historial y se avisa al club.
alter table public.contract_events drop constraint if exists contract_events_kind_check;
alter table public.contract_events add constraint contract_events_kind_check
  check (kind in ('salary', 'renewal', 'released', 'expired'));

create or replace function public.trg_activity_contracts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.kind = 'salary' then
      perform public.record_activity('salary', new.league_id, new.team_id, null, new.player_id,
        'Sueldo de ' || new.player_name, new.amount);
    elsif new.kind = 'renewal' then
      perform public.record_activity('renewal', new.league_id, new.team_id, null, new.player_id,
        'Renovación de ' || new.player_name, new.amount);
    elsif new.kind = 'released' then
      perform public.record_activity('contract_released', new.league_id, new.team_id, null, new.player_id,
        new.player_name || ' se va libre: no había presupuesto para pagarle', new.amount,
        '{}'::jsonb, false,
        case when new.team_id is null then '{}'::uuid[] else array[new.team_id] end,
        'Se te ha ido ' || new.player_name,
        'No había presupuesto para pagar su contrato');
    elsif new.kind = 'expired' then
      perform public.record_activity('contract_expired', new.league_id, new.team_id, null, new.player_id,
        'Se acaba el contrato de ' || new.player_name, new.amount,
        '{}'::jsonb, false,
        case when new.team_id is null then '{}'::uuid[] else array[new.team_id] end,
        'Se acaba el contrato de ' || new.player_name,
        'Renovarlo cuesta ' || public.fmt_money(new.amount) || '. Hazlo en Finanzas.',
        '/finances');
    end if;
  exception when others then
    raise warning 'activity (contracts): %', sqlerrm;
  end;
  return new;
end $$;
