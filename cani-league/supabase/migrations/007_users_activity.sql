-- 007 · Usuarios, historial y notificaciones
--
-- Solo AÑADE cosas: no cambia ninguna política de las tablas que ya existen,
-- así que se puede aplicar con la app actual (main) funcionando.
-- Los triggers del historial nunca hacen fallar la operación original:
-- si algo va mal al apuntar el movimiento, se avisa en el log y sigue.

-- ─── Miembros (lista de invitados) ───────────────────────────────────────────

create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  display_name  text not null,
  team_id       uuid references public.teams(id) on delete set null,
  is_admin      boolean not null default false,
  user_id       uuid unique references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
create unique index if not exists members_email_key on public.members (lower(email));
create index if not exists members_team_idx on public.members (team_id);

alter table public.members enable row level security;

-- ─── Funciones de permisos ───────────────────────────────────────────────────

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and is_admin);
$$;

create or replace function public.my_team_id()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.members where user_id = auth.uid();
$$;

-- Antes de mandar el código: ¿este email está invitado?
create or replace function public.is_invited(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where lower(email) = lower(trim(p_email)));
$$;

-- Tras entrar: une la cuenta de acceso con su ficha de miembro (por email).
create or replace function public.claim_membership()
returns public.members language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_row public.members;
begin
  if auth.uid() is null or v_email = '' then
    return null;
  end if;
  update public.members
     set user_id = auth.uid(), last_seen_at = now()
   where lower(email) = v_email
     and (user_id is null or user_id = auth.uid())
  returning * into v_row;
  return v_row;
end $$;

-- Siempre tiene que quedar al menos un admin.
create or replace function public.members_keep_one_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_admin and (tg_op = 'DELETE' or not new.is_admin) then
    if not exists (select 1 from public.members where is_admin and id <> old.id) then
      raise exception 'Tiene que quedar al menos un admin.';
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists members_keep_one_admin on public.members;
create trigger members_keep_one_admin
  before update or delete on public.members
  for each row execute function public.members_keep_one_admin();

drop policy if exists "members: leer" on public.members;
create policy "members: leer" on public.members
  for select to authenticated using (public.is_member());

drop policy if exists "members: gestionar (admin)" on public.members;
create policy "members: gestionar (admin)" on public.members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─── Historial ───────────────────────────────────────────────────────────────

create table if not exists public.activity_log (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  league_id      uuid references public.leagues(id) on delete cascade,
  kind           text not null,
  team_id        uuid references public.teams(id) on delete set null,
  other_team_id  uuid references public.teams(id) on delete set null,
  player_id      uuid references public.players(id) on delete set null,
  title          text not null,
  amount         bigint,
  payload        jsonb not null default '{}'::jsonb,
  actor_id       uuid references public.members(id) on delete set null,
  actor_name     text,
  as_admin       boolean not null default false,
  private        boolean not null default false
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_team_idx on public.activity_log (team_id, created_at desc);
create index if not exists activity_log_other_idx on public.activity_log (other_team_id, created_at desc);

alter table public.activity_log enable row level security;

-- Todos los miembros ven el historial; las ofertas (private) solo los dos clubes implicados y los admins.
drop policy if exists "activity: leer" on public.activity_log;
create policy "activity: leer" on public.activity_log
  for select to authenticated using (
    public.is_member()
    and (
      not private
      or public.is_admin()
      or public.my_team_id() = team_id
      or public.my_team_id() = other_team_id
    )
  );

-- ─── Notificaciones ──────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  activity_id  uuid references public.activity_log(id) on delete cascade,
  kind         text,
  title        text not null,
  body         text,
  link         text,
  read_at      timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications: las mías" on public.notifications;
create policy "notifications: las mías" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications: marcar leídas" on public.notifications;
create policy "notifications: marcar leídas" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications: borrar" on public.notifications;
create policy "notifications: borrar" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
          when undefined_object then null;
end $$;

-- ─── Utilidades ──────────────────────────────────────────────────────────────

create or replace function public.fmt_money(a bigint)
returns text language sql immutable as $$
  select replace(to_char(coalesce(a, 0), 'FM999,999,999,999,990'), ',', '.') || ' €';
$$;

create or replace function public.is_system_team(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select name ~* '(libre|sin equipo)' from public.teams where id = p_team), false);
$$;

create or replace function public.team_name(p_team uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select name from public.teams where id = p_team), '—');
$$;

create or replace function public.trophy_label(p_trophy text)
returns text language sql immutable as $$
  select case p_trophy
    when 'league' then 'Liga'
    when 'champions' then 'Champions'
    when 'cup' then 'Copa de Liga'
    when 'conference' then 'Conference'
    else p_trophy end;
$$;

-- Apunta un movimiento y avisa a los miembros de los equipos indicados (menos a quien lo hizo).
create or replace function public.record_activity(
  p_kind          text,
  p_league        uuid,
  p_team          uuid,
  p_other         uuid,
  p_player        uuid,
  p_title         text,
  p_amount        bigint default null,
  p_payload       jsonb default '{}'::jsonb,
  p_private       boolean default false,
  p_notify_teams  uuid[] default '{}'::uuid[],
  p_notify_title  text default null,
  p_notify_body   text default null,
  p_link          text default '/movimientos'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_actor public.members;
  v_id uuid;
begin
  select * into v_actor from public.members where user_id = auth.uid();

  insert into public.activity_log (
    league_id, kind, team_id, other_team_id, player_id, title, amount, payload,
    actor_id, actor_name, as_admin, private
  ) values (
    coalesce(p_league, (select league_id from public.teams where id = p_team)),
    p_kind, p_team, p_other, p_player, p_title, p_amount, coalesce(p_payload, '{}'::jsonb),
    v_actor.id, v_actor.display_name,
    coalesce(
      v_actor.is_admin
      and p_team is not null
      and v_actor.team_id is distinct from p_team
      and v_actor.team_id is distinct from p_other,
      false
    ),
    p_private
  ) returning id into v_id;

  if p_notify_title is not null and coalesce(array_length(p_notify_teams, 1), 0) > 0 then
    insert into public.notifications (user_id, activity_id, kind, title, body, link)
    select m.user_id, v_id, p_kind, p_notify_title, p_notify_body, p_link
      from public.members m
     where m.team_id = any (p_notify_teams)
       and m.user_id is not null
       and m.user_id is distinct from auth.uid();
  end if;

  return v_id;
end $$;

-- Movimientos que apunta la propia app (premios por posición, ajustes a mano…).
create or replace function public.log_app_event(
  p_kind    text,
  p_team    uuid,
  p_amount  bigint,
  p_title   text,
  p_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then
    raise exception 'Hace falta iniciar sesión.';
  end if;
  if p_kind not in ('prize_position', 'budget_adjust', 'season_new') then
    raise exception 'Tipo de movimiento no válido.';
  end if;
  return public.record_activity(
    p_kind, null, p_team, null, null, p_title, p_amount, p_payload, false,
    case when p_kind = 'prize_position' and p_team is not null then array[p_team] else '{}'::uuid[] end,
    case when p_kind = 'prize_position' then 'Premio por clasificación' else null end,
    case when p_kind = 'prize_position' then p_title || ': +' || public.fmt_money(p_amount) else null end
  );
end $$;

-- ─── Triggers del historial ──────────────────────────────────────────────────

-- Fichajes, liberaciones y traspasos
create or replace function public.trg_activity_transfers()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_from_sys boolean := public.is_system_team(new.from_team_id);
  v_to_sys   boolean := public.is_system_team(new.to_team_id);
  v_via_offer boolean;
begin
  begin
    if v_from_sys or new.from_team_id is null then
      perform public.record_activity(
        'signing', new.league_id, new.to_team_id, null, new.player_id,
        new.player_name || ' ficha por ' || coalesce(new.to_team_name, public.team_name(new.to_team_id)),
        new.fee::bigint, jsonb_build_object('from', 'free_agents'));
    elsif v_to_sys or new.to_team_id is null then
      perform public.record_activity(
        'release', new.league_id, new.from_team_id, null, new.player_id,
        new.player_name || ' sale de ' || coalesce(new.from_team_name, public.team_name(new.from_team_id)) || ' (liberado)',
        new.fee::bigint);
    else
      v_via_offer := exists (
        select 1 from public.transfer_offers o
         where o.status = 'accepted'
           and (o.player_id = new.player_id or o.swap_player_id = new.player_id)
           and o.resolved_at > now() - interval '5 minutes');
      perform public.record_activity(
        'transfer', new.league_id, new.to_team_id, new.from_team_id, new.player_id,
        new.player_name || ': ' || coalesce(new.from_team_name, public.team_name(new.from_team_id))
          || ' → ' || coalesce(new.to_team_name, public.team_name(new.to_team_id)),
        new.fee::bigint,
        jsonb_build_object('via_offer', v_via_offer),
        false,
        case when v_via_offer then '{}'::uuid[] else array[new.from_team_id] end,
        'Te han fichado a ' || new.player_name,
        coalesce(new.to_team_name, public.team_name(new.to_team_id)) || ' paga ' || public.fmt_money(new.fee::bigint)
      );
    end if;
  exception when others then
    raise warning 'activity (transfers): %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists activity_transfers on public.transfers;
create trigger activity_transfers after insert on public.transfers
  for each row execute function public.trg_activity_transfers();

-- Ofertas
create or replace function public.trg_activity_offers()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_player text;
  v_swap   text;
  v_buyer  text := public.team_name(new.buyer_team_id);
  v_seller text := public.team_name(new.seller_team_id);
  v_what   text;
  v_payload jsonb;
  v_moved  boolean;
begin
  begin
    select name into v_player from public.players where id = new.player_id;
    select name into v_swap from public.players where id = new.swap_player_id;
    v_what := case
      when new.amount > 0 and v_swap is not null then public.fmt_money(new.amount) || ' + ' || v_swap
      when v_swap is not null then v_swap
      else public.fmt_money(new.amount) end;
    v_payload := jsonb_build_object('offer_id', new.id, 'player', v_player, 'swap', v_swap);

    if tg_op = 'INSERT' then
      perform public.record_activity(
        'offer_made', new.league_id, new.buyer_team_id, new.seller_team_id, new.player_id,
        v_buyer || ' ofrece ' || v_what || ' por ' || coalesce(v_player, 'un jugador'),
        new.amount, v_payload, true,
        array[new.seller_team_id], 'Nueva oferta por ' || coalesce(v_player, 'un jugador'),
        v_buyer || ' ofrece ' || v_what, '/market');

    elsif old.status = 'pending' and new.status <> 'pending' then
      if new.status = 'accepted' then
        perform public.record_activity(
          'offer_accepted', new.league_id, new.buyer_team_id, new.seller_team_id, new.player_id,
          v_seller || ' acepta la oferta de ' || v_buyer || ' por ' || coalesce(v_player, 'un jugador'),
          new.amount, v_payload, true,
          array[new.buyer_team_id], 'Oferta aceptada',
          v_seller || ' acepta tu oferta por ' || coalesce(v_player, 'su jugador'));
      elsif new.status = 'rejected' then
        perform public.record_activity(
          'offer_rejected', new.league_id, new.buyer_team_id, new.seller_team_id, new.player_id,
          v_seller || ' rechaza la oferta de ' || v_buyer || ' por ' || coalesce(v_player, 'un jugador'),
          new.amount, v_payload, true,
          array[new.buyer_team_id], 'Oferta rechazada',
          v_seller || ' rechaza tu oferta por ' || coalesce(v_player, 'su jugador'), '/market');
      elsif new.status = 'cancelled' then
        -- Si el jugador (o el del intercambio) ya cambió de club, la oferta caduca; si no, la retiró quien la hizo.
        v_moved := not exists (select 1 from public.players where id = new.player_id and team_id = new.seller_team_id)
          or (new.swap_player_id is not null
              and not exists (select 1 from public.players where id = new.swap_player_id and team_id = new.buyer_team_id));
        if v_moved then
          perform public.record_activity(
            'offer_expired', new.league_id, new.buyer_team_id, new.seller_team_id, new.player_id,
            'Caduca la oferta de ' || v_buyer || ' por ' || coalesce(v_player, 'un jugador'),
            new.amount, v_payload, true,
            array[new.buyer_team_id], 'Oferta caducada',
            'Tu oferta por ' || coalesce(v_player, 'el jugador') || ' ya no vale: el jugador ha cambiado de club', '/market');
        else
          perform public.record_activity(
            'offer_cancelled', new.league_id, new.buyer_team_id, new.seller_team_id, new.player_id,
            v_buyer || ' retira su oferta por ' || coalesce(v_player, 'un jugador'),
            new.amount, v_payload, true);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'activity (offers): %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists activity_offers on public.transfer_offers;
create trigger activity_offers after insert or update of status on public.transfer_offers
  for each row execute function public.trg_activity_offers();

-- Contratos: sueldos, renovaciones y jugadores que se van por no poder pagarles
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
    end if;
  exception when others then
    raise warning 'activity (contracts): %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists activity_contracts on public.contract_events;
create trigger activity_contracts after insert on public.contract_events
  for each row execute function public.trg_activity_contracts();

-- Partidos de liga
create or replace function public.trg_activity_matches()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_edit  boolean;
begin
  begin
    if new.played and new.home_goals is not null and new.away_goals is not null
       and (tg_op = 'INSERT'
            or not old.played
            or old.home_goals is distinct from new.home_goals
            or old.away_goals is distinct from new.away_goals) then
      v_edit := tg_op = 'UPDATE' and old.played;
      v_title := public.team_name(new.home_team_id) || ' ' || new.home_goals || ' - ' || new.away_goals
                 || ' ' || public.team_name(new.away_team_id);
      perform public.record_activity(
        'match', new.league_id, new.home_team_id, new.away_team_id, null,
        case when v_edit then 'Resultado corregido: ' else '' end || v_title, null,
        jsonb_build_object('match_id', new.id, 'home_goals', new.home_goals, 'away_goals', new.away_goals,
                           'round', new.round, 'edited', v_edit),
        false,
        array[new.home_team_id, new.away_team_id],
        case when v_edit then 'Resultado corregido' else 'Resultado apuntado' end,
        v_title, '/calendar');
    end if;
  exception when others then
    raise warning 'activity (matches): %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists activity_matches on public.matches;
create trigger activity_matches after insert or update on public.matches
  for each row execute function public.trg_activity_matches();

-- Partidos de copa (ida y vuelta)
create or replace function public.trg_activity_cup_ties()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_leg   int;
  v_hg    int;
  v_ag    int;
  v_title text;
begin
  begin
    if new.home_team_id is null or new.away_team_id is null then
      return new;
    end if;
    if new.leg1_home_goals is not null and new.leg1_away_goals is not null
       and (old.leg1_home_goals is distinct from new.leg1_home_goals
            or old.leg1_away_goals is distinct from new.leg1_away_goals) then
      v_leg := 1; v_hg := new.leg1_home_goals; v_ag := new.leg1_away_goals;
    elsif new.leg2_home_goals is not null and new.leg2_away_goals is not null
       and (old.leg2_home_goals is distinct from new.leg2_home_goals
            or old.leg2_away_goals is distinct from new.leg2_away_goals) then
      v_leg := 2; v_hg := new.leg2_home_goals; v_ag := new.leg2_away_goals;
    else
      return new;
    end if;

    v_title := public.trophy_label(new.trophy)
      || case when new.is_final then ' (final)' when v_leg = 1 then ' (ida)' else ' (vuelta)' end
      || ': ' || public.team_name(new.home_team_id) || ' ' || v_hg || ' - ' || v_ag || ' '
      || public.team_name(new.away_team_id);

    perform public.record_activity(
      'cup_match', new.league_id, new.home_team_id, new.away_team_id, null, v_title, null,
      jsonb_build_object('tie_id', new.id, 'trophy', new.trophy, 'leg', v_leg),
      false, array[new.home_team_id, new.away_team_id], 'Resultado de copa', v_title, '/cups');
  exception when others then
    raise warning 'activity (cups): %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists activity_cup_ties on public.cup_ties;
create trigger activity_cup_ties after update on public.cup_ties
  for each row execute function public.trg_activity_cup_ties();

-- Títulos
create or replace function public.trg_activity_trophies()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old   int := case when tg_op = 'INSERT' then 0 else old.count end;
  v_prize bigint;
  v_label text := public.trophy_label(new.trophy);
begin
  begin
    select tp.prize into v_prize
      from public.trophy_prizes tp
      join public.teams t on t.league_id = tp.league_id
     where t.id = new.team_id and tp.trophy = new.trophy;

    if new.count > v_old then
      perform public.record_activity(
        'trophy', null, new.team_id, null, null,
        public.team_name(new.team_id) || ' gana la ' || v_label, v_prize,
        jsonb_build_object('trophy', new.trophy, 'count', new.count), false,
        array[new.team_id], '¡Campeones de la ' || v_label || '!',
        case when coalesce(v_prize, 0) > 0 then 'Premio: +' || public.fmt_money(v_prize) else null end,
        '/trophies');
    elsif new.count < v_old then
      perform public.record_activity(
        'trophy_removed', null, new.team_id, null, null,
        'Se le quita una ' || v_label || ' a ' || public.team_name(new.team_id), v_prize,
        jsonb_build_object('trophy', new.trophy, 'count', new.count));
    end if;
  exception when others then
    raise warning 'activity (trophies): %', sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists activity_trophies on public.team_trophies;
create trigger activity_trophies after insert or update of count on public.team_trophies
  for each row execute function public.trg_activity_trophies();

-- ─── Permisos de las funciones ───────────────────────────────────────────────

revoke all on function public.record_activity(text, uuid, uuid, uuid, uuid, text, bigint, jsonb, boolean, uuid[], text, text, text) from public, anon, authenticated;
revoke all on function public.claim_membership() from public, anon;
revoke all on function public.log_app_event(text, uuid, bigint, text, jsonb) from public, anon;
grant execute on function public.claim_membership() to authenticated;
grant execute on function public.log_app_event(text, uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.is_invited(text) to anon, authenticated;
grant execute on function public.is_member() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.my_team_id() to anon, authenticated;

-- ─── Primer admin ────────────────────────────────────────────────────────────

insert into public.members (email, display_name, is_admin)
values ('terumarc@gmail.com', 'Marc', true)
on conflict ((lower(email))) do nothing;
