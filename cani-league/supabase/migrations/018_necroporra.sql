-- 018 · Fuera las cartas · La Necroporra
--
-- ⚠️ Aplicar DESPUÉS de desplegar en main la versión sin cartas.
--
-- 1. Cartas de Suerte y Caja B: se quitan del todo. El dinero que ya movieron
--    se queda donde está (y sus líneas siguen en Movimientos).
-- 2. La Necroporra: al empezar cada temporada, cada miembro ordena cómo cree que
--    acabará la liga. Se puede cambiar hasta que se juega el primer partido de
--    liga de la temporada; entonces se cierra y se ven las porras de todos.
--    Puntúan los demás clubes (el propio no): 3 puntos por puesto exacto y
--    1 si se queda a un puesto.
-- 3. Premios al acabar la liga (al club de cada uno): 500.000 € por punto y
--    3M más para quien gane la porra (si empatan, se reparten). Con 7 clubes el
--    máximo teórico es 12M; lo normal, 2–6M. Al nivel de las cartas (tope 5M)
--    y lejos de los premios por puesto (25–55M por vuelta).

-- ─── 1. Fuera las cartas ─────────────────────────────────────────────────────

drop trigger if exists matches_undo_cards on public.matches;
drop function if exists public.matches_undo_cards();
drop function if exists public.undo_match_cards(uuid);
drop function if exists public.reveal_card(uuid);
drop function if exists public.draw_card(uuid, uuid);
drop function if exists public.card_reveal_internal(uuid);
drop function if exists public.card_table_edge(uuid, text, boolean);
drop table if exists public.card_draws;
drop table if exists public.card_events;

delete from public.notifications where kind = 'card_pending';
-- Los avisos de cartas ya giradas llevaban a Noticias, que ya no existe.
update public.notifications set link = '/movimientos' where link = '/noticias';

-- ─── 2. La Necroporra ────────────────────────────────────────────────────────

create table if not exists public.necroporra_picks (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues(id) on delete cascade,
  season      text not null,
  member_id   uuid not null references public.members(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,  -- su club al hacer la porra (no puntúa)
  ranking     uuid[] not null,                                       -- todos los clubes, del 1º al último
  points      integer,                                               -- al cobrar: puntos finales
  prize       bigint,                                                -- al cobrar: lo que se llevó su club
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (league_id, season, member_id)
);
create index if not exists necroporra_picks_season_idx on public.necroporra_picks (league_id, season);

-- Cerrada en cuanto hay un partido de liga jugado en esa temporada.
create or replace function public.necroporra_locked(p_league uuid, p_season text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches
     where league_id = p_league and season is not distinct from p_season and played
  );
$$;
grant execute on function public.necroporra_locked(uuid, text) to anon, authenticated;

alter table public.necroporra_picks enable row level security;
-- Mientras está abierta cada uno solo ve la suya; al cerrarse, todos ven todas.
drop policy if exists "lectura" on public.necroporra_picks;
create policy "lectura" on public.necroporra_picks for select to anon, authenticated
  using (member_id = public.current_member_id() or public.necroporra_locked(league_id, season));
-- Escribir solo con save_necroporra.

-- Quién la ha hecho ya (sin enseñar qué ha puesto).
create or replace function public.necroporra_entrants(p_league uuid, p_season text)
returns table (member_id uuid, display_name text, team_id uuid, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.member_id, m.display_name, p.team_id, p.updated_at
    from public.necroporra_picks p
    join public.members m on m.id = p.member_id
   where p.league_id = p_league and p.season = p_season
   order by p.updated_at;
$$;
grant execute on function public.necroporra_entrants(uuid, text) to anon, authenticated;

-- Guardar (o cambiar) la porra de quien ha entrado, para la temporada en curso.
create or replace function public.save_necroporra(p_league uuid, p_ranking uuid[])
returns public.necroporra_picks language plpgsql security definer set search_path = public as $$
declare
  v_member public.members;
  v_season text;
  v_clubs  uuid[];
  v_row    public.necroporra_picks;
begin
  select * into v_member from public.members where id = public.current_member_id();
  if v_member.id is null then
    raise exception 'Tienes que entrar en la app para hacer la porra.';
  end if;

  select season into v_season from public.leagues where id = p_league;
  if v_season is null then raise exception 'Liga no encontrada.'; end if;

  if public.necroporra_locked(p_league, v_season) then
    raise exception 'La Necroporra ya está cerrada: se ha jugado el primer partido.';
  end if;

  select array_agg(id order by id) into v_clubs
    from public.teams where league_id = p_league and not public.is_system_team(id);

  if coalesce(array_length(p_ranking, 1), 0) <> coalesce(array_length(v_clubs, 1), 0)
     or (select array_agg(x order by x) from unnest(p_ranking) x) is distinct from v_clubs then
    raise exception 'La porra tiene que llevar todos los clubes, cada uno una vez.';
  end if;

  insert into public.necroporra_picks (league_id, season, member_id, team_id, ranking)
  values (p_league, v_season, v_member.id, v_member.team_id, p_ranking)
  on conflict (league_id, season, member_id)
  do update set ranking = excluded.ranking, team_id = excluded.team_id, updated_at = now()
  returning * into v_row;

  return v_row;
end $$;
revoke all on function public.save_necroporra(uuid, uuid[]) from public, anon;
grant execute on function public.save_necroporra(uuid, uuid[]) to authenticated;

-- Al cambiar de temporada se avisa a todos de que la Necroporra está abierta.
create or replace function public.leagues_necroporra_open()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.season is distinct from old.season then
    insert into public.notifications (user_id, kind, title, body, link)
    select distinct d.user_id, 'necroporra', 'La Necroporra está abierta',
           'Ordena cómo acabará la temporada ' || new.season || ' antes del primer partido.', '/necroporra'
      from public.member_devices d;
  end if;
  return new;
end $$;

drop trigger if exists leagues_necroporra_open on public.leagues;
create trigger leagues_necroporra_open
  after update of season on public.leagues
  for each row execute function public.leagues_necroporra_open();

-- ─── 3. Premios ──────────────────────────────────────────────────────────────
-- Se llama al acabar la vuelta con la clasificación final (del 1º al último).
-- Solo cobra una vez por temporada.

create or replace function public.pay_necroporra(p_league uuid, p_season text, p_final uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  c_per_point constant bigint := 500000;
  c_winner    constant bigint := 3000000;
  v_best      integer;
  v_winners   integer;
  v_prize     bigint;
  r           record;
  n           integer := 0;
begin
  if not public.is_member() then raise exception 'Hace falta entrar en la app.'; end if;
  if exists (select 1 from public.necroporra_picks
              where league_id = p_league and season = p_season and prize is not null) then
    return 0;
  end if;

  -- Puntos de cada porra: el club propio no cuenta.
  update public.necroporra_picks p set points = coalesce((
    select sum(case abs(g.i - array_position(p_final, g.team))
                 when 0 then 3 when 1 then 1 else 0 end)
      from unnest(p.ranking) with ordinality as g(team, i)
     where g.team is distinct from p.team_id and array_position(p_final, g.team) is not null
  ), 0)
  where p.league_id = p_league and p.season = p_season;

  select max(points) into v_best from public.necroporra_picks
   where league_id = p_league and season = p_season and team_id is not null;
  select count(*) into v_winners from public.necroporra_picks
   where league_id = p_league and season = p_season and team_id is not null
     and points = v_best and v_best > 0;

  for r in select * from public.necroporra_picks
            where league_id = p_league and season = p_season loop
    v_prize := case when r.team_id is null then 0 else
      r.points * c_per_point
      + case when r.points = v_best and v_best > 0 then c_winner / greatest(v_winners, 1) else 0 end end;
    update public.necroporra_picks set prize = v_prize where id = r.id;
    if v_prize > 0 then
      update public.teams set budget = budget + v_prize where id = r.team_id;
      perform public.record_activity(
        'necroporra', p_league, r.team_id, null, null,
        case when r.points = v_best then 'Gana la Necroporra (' || r.points || ' pts)'
             else 'Necroporra: ' || r.points || ' pts' end,
        v_prize, jsonb_build_object('season', p_season, 'points', r.points), false,
        array[r.team_id], 'Premio de la Necroporra',
        r.points || ' puntos: +' || public.fmt_money(v_prize), '/necroporra');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.pay_necroporra(uuid, text, uuid[]) from public, anon;
grant execute on function public.pay_necroporra(uuid, text, uuid[]) to authenticated;
