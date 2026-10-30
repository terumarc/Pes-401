-- 014 · Cartas de Suerte y Caja B
--
-- Solo AÑADE cosas: se puede aplicar con la app de main funcionando.
-- Las cartas solo se sortean desde la app nueva (al apuntar un partido de liga),
-- así que hasta que esa versión esté desplegada no pasa nada.
--
-- Reglas:
--  · Al apuntar un partido de liga, cada club tiene un 25% de sacar carta.
--  · Tras 5 partidos de liga seguidos sin carta, el siguiente la saca seguro.
--  · Máximo 2 cartas por club en cada vuelta.
--  · El dinero se mueve al sacarla; girarla solo la muestra. Nadie queda en negativo:
--    si no le llega, paga lo que tenga.

-- ─── Facciones ───────────────────────────────────────────────────────────────

alter table public.teams
  add column if not exists faction text check (faction in ('fede', 'antifede', 'cefa'));

update public.teams set faction = 'fede'
 where faction is null and name ~* '^(all the aces|union deportiva chamba|u\.?d\.? chamba|macedonios)';
update public.teams set faction = 'antifede'
 where faction is null and name ~* '^(flaming donuts|cum makers|harris united)';
update public.teams set faction = 'cefa'
 where faction is null and name ~* '^charly';

-- ─── Catálogo ────────────────────────────────────────────────────────────────

create table if not exists public.card_events (
  id        text primary key,
  deck      text not null check (deck in ('suerte', 'cajab')),
  faction   text check (faction in ('fede', 'antifede', 'cefa')),  -- null: le puede salir a cualquiera
  rarity    text not null check (rarity in ('comun', 'medio', 'raro', 'legendario', 'choque', 'clubes')),
  weight    integer not null check (weight > 0),
  icon      text not null,
  text      text not null,
  effect    jsonb not null,
  active    boolean not null default true
);

-- Efectos (cantidades en millones, desde el punto de vista del club que saca la carta):
--   {"t":"self","a":N}             cobra (N>0) o paga (N<0)
--   {"t":"rival","f":F,"a":N}      con un club al azar de la facción F (null: cualquier otro club)
--   {"t":"mates","per":N}          con cada uno de los otros clubes de su facción
--   {"t":"all","per":N}            con cada uno de los demás clubes
--   {"t":"leader","a":N}           con el líder de la liga (no sale si el líder es él)
--   {"t":"last","a":N}             con el último (no sale si el último es él)

alter table public.card_events enable row level security;
drop policy if exists "lectura" on public.card_events;
create policy "lectura" on public.card_events for select to anon, authenticated using (true);
drop policy if exists "admins: editar" on public.card_events;
create policy "admins: editar" on public.card_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Cartas sacadas ──────────────────────────────────────────────────────────

create table if not exists public.card_draws (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  team_id      uuid not null references public.teams(id) on delete cascade,
  match_id     uuid references public.matches(id) on delete set null,
  season       text,
  round        integer,
  event_id     text not null references public.card_events(id),
  deck         text not null,
  rarity       text not null,
  faction      text,
  icon         text not null,
  text         text not null,
  amount       bigint not null default 0,              -- lo que gana (+) o pierde (−) el club
  transfers    jsonb not null default '[]'::jsonb,     -- [{team_id, team_name, amount}] desde su punto de vista
  status       text not null default 'pending' check (status in ('pending', 'revealed')),
  revealed_at  timestamptz,
  unique (match_id, team_id)
);
create index if not exists card_draws_league_idx on public.card_draws (league_id, created_at desc);
create index if not exists card_draws_team_idx on public.card_draws (team_id, created_at desc);

alter table public.card_draws enable row level security;
drop policy if exists "lectura" on public.card_draws;
create policy "lectura" on public.card_draws for select to anon, authenticated using (true);
-- Escribir solo a través de las funciones de abajo.

-- ─── Clasificación (para el líder y el último) ───────────────────────────────

create or replace function public.card_table_edge(p_league uuid, p_season text, p_last boolean)
returns uuid language sql stable security definer set search_path = public as $$
  with t as (
    select id from public.teams where league_id = p_league and not public.is_system_team(id)
  ), r as (
    select t.id,
      coalesce(sum(case
        when m.home_team_id = t.id and m.home_goals > m.away_goals then 3
        when m.away_team_id = t.id and m.away_goals > m.home_goals then 3
        when m.home_goals = m.away_goals then 1 else 0 end), 0) as pts,
      coalesce(sum(case when m.home_team_id = t.id then m.home_goals - m.away_goals
                        else m.away_goals - m.home_goals end), 0) as dg,
      coalesce(sum(case when m.home_team_id = t.id then m.home_goals else m.away_goals end), 0) as gf
    from t
    left join public.matches m
      on m.league_id = p_league and m.season is not distinct from p_season and m.played
     and (m.home_team_id = t.id or m.away_team_id = t.id)
    group by t.id
  )
  select id from r
   order by
     case when p_last then -pts else pts end desc,
     case when p_last then -dg else dg end desc,
     case when p_last then -gf else gf end desc
   limit 1;
$$;

-- ─── Sacar carta ─────────────────────────────────────────────────────────────

create or replace function public.draw_card(p_match uuid, p_team uuid)
returns public.card_draws language plpgsql security definer set search_path = public as $$
declare
  v_match    public.matches;
  v_team     public.teams;
  v_draw     public.card_draws;
  v_event    public.card_events;
  v_count    integer;
  v_since    integer;
  v_last_at  timestamptz;
  v_leader   uuid;
  v_last     uuid;
  v_eff      jsonb;
  v_kind     text;
  v_cp       uuid;
  v_moved    bigint;
  v_net      bigint := 0;
  v_transfers jsonb := '[]'::jsonb;
  v_cps      jsonb := '[]'::jsonb;
  v_budget   bigint;
  r          record;
begin
  if not public.is_member() then
    raise exception 'Hace falta entrar en la app.';
  end if;

  select * into v_match from public.matches where id = p_match;
  if v_match.id is null or not v_match.played then return null; end if;
  if p_team is distinct from v_match.home_team_id and p_team is distinct from v_match.away_team_id then
    return null;
  end if;

  select * into v_team from public.teams where id = p_team;
  if v_team.id is null or v_team.faction is null or public.is_system_team(p_team) then return null; end if;

  -- Ya sacó carta con este partido (p. ej. se corrige el resultado): nada.
  if exists (select 1 from public.card_draws where match_id = p_match and team_id = p_team) then
    return null;
  end if;

  -- Máximo 2 por vuelta.
  select count(*) into v_count from public.card_draws
   where team_id = p_team and league_id = v_match.league_id
     and season is not distinct from v_match.season and round is not distinct from v_match.round;
  if v_count >= 2 then return null; end if;

  -- Partidos de liga jugados desde su última carta (este incluido).
  select max(created_at) into v_last_at from public.card_draws
   where team_id = p_team and league_id = v_match.league_id and season is not distinct from v_match.season;
  select count(*) into v_since from public.matches m
   where m.league_id = v_match.league_id and m.season is not distinct from v_match.season and m.played
     and (m.home_team_id = p_team or m.away_team_id = p_team)
     and (v_last_at is null or m.played_at > v_last_at);

  if v_since < 6 and random() >= 0.25 then return null; end if;

  v_leader := public.card_table_edge(v_match.league_id, v_match.season, false);
  v_last   := public.card_table_edge(v_match.league_id, v_match.season, true);

  -- Elegir carta según su peso, solo entre las que se pueden aplicar.
  select e.* into v_event
    from public.card_events e
   where e.active
     and (e.faction is null or e.faction = v_team.faction)
     and case e.effect->>'t'
       when 'rival' then exists (
         select 1 from public.teams o
          where o.league_id = v_team.league_id and o.id <> p_team and not public.is_system_team(o.id)
            and (e.effect->>'f' is null or o.faction = e.effect->>'f'))
       when 'mates' then exists (
         select 1 from public.teams o
          where o.league_id = v_team.league_id and o.id <> p_team and o.faction = v_team.faction)
       when 'leader' then v_leader is not null and v_leader <> p_team
       when 'last' then v_last is not null and v_last <> p_team
       else true end
   order by -ln(1 - random()) / e.weight
   limit 1;
  if v_event.id is null then return null; end if;

  v_eff := v_event.effect;
  v_kind := v_eff->>'t';

  -- Lista de contrapartes con la cantidad (en euros) desde el punto de vista del club.
  if v_kind = 'self' then
    v_cps := jsonb_build_array(jsonb_build_object('team_id', null, 'amount', (v_eff->>'a')::bigint * 1000000));
  elsif v_kind = 'rival' then
    select o.id into v_cp from public.teams o
     where o.league_id = v_team.league_id and o.id <> p_team and not public.is_system_team(o.id)
       and (v_eff->>'f' is null or o.faction = v_eff->>'f')
     order by random() limit 1;
    v_cps := jsonb_build_array(jsonb_build_object('team_id', v_cp, 'amount', (v_eff->>'a')::bigint * 1000000));
  elsif v_kind in ('mates', 'all') then
    select coalesce(jsonb_agg(jsonb_build_object('team_id', o.id, 'amount', (v_eff->>'per')::bigint * 1000000)), '[]'::jsonb)
      into v_cps
      from public.teams o
     where o.league_id = v_team.league_id and o.id <> p_team and not public.is_system_team(o.id)
       and (v_kind = 'all' or o.faction = v_team.faction);
  elsif v_kind = 'leader' then
    v_cps := jsonb_build_array(jsonb_build_object('team_id', v_leader, 'amount', (v_eff->>'a')::bigint * 1000000));
  elsif v_kind = 'last' then
    v_cps := jsonb_build_array(jsonb_build_object('team_id', v_last, 'amount', (v_eff->>'a')::bigint * 1000000));
  end if;

  -- Aplicar: quien paga, paga lo que tenga como mucho.
  for r in select (x->>'team_id')::uuid as team_id, (x->>'amount')::bigint as amount
             from jsonb_array_elements(v_cps) x loop
    if r.amount > 0 then
      if r.team_id is null then
        v_moved := r.amount;
      else
        select budget into v_budget from public.teams where id = r.team_id for update;
        v_moved := least(r.amount, greatest(v_budget, 0));
        update public.teams set budget = budget - v_moved where id = r.team_id;
      end if;
      update public.teams set budget = budget + v_moved where id = p_team;
      v_net := v_net + v_moved;
    else
      select budget into v_budget from public.teams where id = p_team for update;
      v_moved := least(-r.amount, greatest(v_budget, 0));
      update public.teams set budget = budget - v_moved where id = p_team;
      if r.team_id is not null then
        update public.teams set budget = budget + v_moved where id = r.team_id;
      end if;
      v_moved := -v_moved;
      v_net := v_net + v_moved;
    end if;
    if r.team_id is not null then
      v_transfers := v_transfers || jsonb_build_object(
        'team_id', r.team_id, 'team_name', public.team_name(r.team_id), 'amount', v_moved);
    end if;
  end loop;

  -- La carta anterior que siguiera boca abajo se gira sola.
  perform public.card_reveal_internal(d.id) from public.card_draws d
   where d.team_id = p_team and d.status = 'pending';

  insert into public.card_draws (
    league_id, team_id, match_id, season, round, event_id, deck, rarity, faction, icon, text,
    amount, transfers
  ) values (
    v_match.league_id, p_team, p_match, v_match.season, v_match.round, v_event.id, v_event.deck,
    v_event.rarity, v_event.faction, v_event.icon, v_event.text, v_net, v_transfers
  ) returning * into v_draw;

  -- Aviso a su club: tiene una carta por girar (sin desvelar cuál).
  insert into public.notifications (user_id, kind, title, body, link)
  select distinct d.user_id, 'card_pending',
         case when v_event.deck = 'suerte' then 'Tienes una carta de Suerte' else 'Tienes una carta de Caja B' end,
         'Entra y gírala.', '/noticias'
    from public.member_devices d
    join public.members m on m.id = d.member_id
   where m.team_id = p_team;

  return v_draw;
end $$;

-- ─── Girar carta ─────────────────────────────────────────────────────────────
-- La gira su club o un admin. Al girarla queda en el historial y se avisa a los clubes implicados.

create or replace function public.card_reveal_internal(p_draw uuid)
returns public.card_draws language plpgsql security definer set search_path = public as $$
declare
  v_draw public.card_draws;
  v_others uuid[];
  v_deck text;
begin
  update public.card_draws set status = 'revealed', revealed_at = now()
   where id = p_draw and status = 'pending' returning * into v_draw;
  if v_draw.id is null then
    select * into v_draw from public.card_draws where id = p_draw;
    return v_draw;
  end if;

  select coalesce(array_agg((x->>'team_id')::uuid), '{}'::uuid[]) into v_others
    from jsonb_array_elements(v_draw.transfers) x;
  v_deck := case when v_draw.deck = 'suerte' then 'Suerte' else 'Caja B' end;

  begin
    perform public.record_activity(
      'card', v_draw.league_id, v_draw.team_id,
      case when array_length(v_others, 1) = 1 then v_others[1] else null end,
      null, v_draw.text, v_draw.amount,
      jsonb_build_object('draw_id', v_draw.id, 'deck', v_draw.deck, 'rarity', v_draw.rarity,
                         'event_id', v_draw.event_id, 'transfers', v_draw.transfers),
      false, v_others,
      public.team_name(v_draw.team_id) || ' ha sacado una carta de ' || v_deck,
      v_draw.text, '/noticias');
  exception when others then
    raise warning 'card_reveal_internal: no se pudo apuntar en el historial: %', sqlerrm;
  end;

  return v_draw;
end $$;

revoke all on function public.card_reveal_internal(uuid) from public, anon, authenticated;

create or replace function public.reveal_card(p_draw uuid)
returns public.card_draws language plpgsql security definer set search_path = public as $$
declare
  v_team uuid;
begin
  select team_id into v_team from public.card_draws where id = p_draw;
  if v_team is null then return null; end if;
  if not (public.is_admin() or public.my_team_id() = v_team) then
    raise exception 'Solo su club puede girar esta carta.';
  end if;
  return public.card_reveal_internal(p_draw);
end $$;

revoke all on function public.draw_card(uuid, uuid) from public, anon;
grant execute on function public.draw_card(uuid, uuid) to authenticated;
revoke all on function public.reveal_card(uuid) from public, anon;
grant execute on function public.reveal_card(uuid) to authenticated;
