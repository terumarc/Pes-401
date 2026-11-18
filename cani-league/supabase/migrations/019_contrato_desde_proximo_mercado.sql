-- 019 · El contrato empieza a contar en el próximo mercado que se abra
--
-- · Si un jugador se ficha con el mercado abierto, su contrato cumple años en ese
--   mercado (como hasta ahora).
-- · Si se ficha con el mercado cerrado (a mano, entre mercados), su contrato cumple
--   años en el PRÓXIMO mercado que se abra: durante la ida, el de invierno; durante la
--   vuelta, el de inicio de temporada. Y ese primer mercado no le quita ningún año:
--   el contrato empieza a contar a partir de ahí.
-- · El mercado de invierno se abre al acabar la ida aunque se haya jugado algún
--   partido de vuelta antes de tiempo: solo lo cierran los de vuelta jugados después.
-- Solo añade cosas: la app de antes sigue funcionando.

-- true = su contrato aún no ha empezado a contar (lo hará en su próximo mercado).
alter table public.players
  add column if not exists contract_pending_start boolean not null default false;

-- ¿Está abierto el mercado de invierno? Ida acabada y ningún partido de vuelta jugado después.
create or replace function public.is_winter_window(p_league uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with s as (select season from public.leagues where id = p_league),
  m as (
    select round, played, played_at from public.matches
     where league_id = p_league and season is not distinct from (select season from s)
  ),
  ida as (select max(played_at) as fin from m where round = 1)
  select exists (select 1 from m where round = 1)
     and not exists (select 1 from m where round = 1 and not played)
     and not exists (
       select 1 from m, ida
        where m.round = 2 and m.played
          and (ida.fin is null or m.played_at is null or m.played_at > ida.fin)
     );
$$;

-- Mercado en el que cuenta un fichaje hecho ahora y si ya está abierto.
create or replace function public.contract_anchor_now(p_league uuid, out anchor text, out pending boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_total int; v_played int; v_ida int; v_ida_played int;
begin
  select count(*), count(*) filter (where played),
         count(*) filter (where round = 1), count(*) filter (where round = 1 and played)
    into v_total, v_played, v_ida, v_ida_played
    from public.matches
   where league_id = p_league
     and season is not distinct from (select season from public.leagues where id = p_league);

  if v_total = 0 or v_played = 0 or v_played = v_total then
    anchor := 'summer'; pending := false;          -- pretemporada o temporada acabada: mercado abierto
  elsif public.is_winter_window(p_league) then
    anchor := 'winter'; pending := false;          -- mercado de invierno abierto
  elsif v_ida_played < v_ida then
    anchor := 'winter'; pending := true;           -- en plena ida: cuenta desde el próximo invierno
  else
    anchor := 'summer'; pending := true;           -- en plena vuelta: cuenta desde el próximo inicio de temporada
  end if;
end $$;

-- Al cambiar de club: contrato nuevo y completo, que empieza a contar en su mercado.
create or replace function public.players_track_joined_team()
returns trigger language plpgsql as $$
declare
  v_league uuid; v_anchor text; v_pending boolean;
begin
  if tg_op = 'INSERT' or new.team_id is distinct from old.team_id then
    new.joined_team_at := now();
    if tg_op = 'UPDATE' then
      select league_id into v_league from public.teams where id = new.team_id;
      if v_league is null then
        new.contract_anchor := 'summer'; new.contract_pending_start := false;
      else
        select anchor, pending into v_anchor, v_pending from public.contract_anchor_now(v_league);
        new.contract_anchor := v_anchor; new.contract_pending_start := v_pending;
      end if;
      new.contract_seasons_left := null;
    end if;
  end if;
  return new;
end $$;
