-- 010 · Entrar eligiendo club + PIN, sin correo
--
-- Cada móvil/navegador tiene una sesión anónima de Supabase (sin email). Esa
-- sesión se une a un miembro de la liga al elegir club:
--   · club libre + enlace de invitación → se crea el miembro con su nombre y su PIN;
--   · club ya cogido → hay que poner el PIN de ese club.
-- Un miembro puede tener varios dispositivos (móvil, app en pantalla de inicio, ordenador).

-- ─── Miembros sin email y con PIN ────────────────────────────────────────────

alter table public.members add column if not exists pin_hash text;
alter table public.members add column if not exists pin_failures int not null default 0;
alter table public.members add column if not exists pin_locked_until timestamptz;

-- Un club, un dueño.
create unique index if not exists members_team_key on public.members (team_id) where team_id is not null;

-- ─── Dispositivos ────────────────────────────────────────────────────────────

create table if not exists public.member_devices (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
create index if not exists member_devices_member_idx on public.member_devices (member_id);

alter table public.member_devices enable row level security;

create policy "devices: los míos" on public.member_devices
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ─── Quién soy (ahora por dispositivo) ───────────────────────────────────────

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select member_id from public.member_devices where user_id = auth.uid()),
    (select id from public.members where user_id = auth.uid())
  );
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_member_id() is not null;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.members where id = public.current_member_id()), false);
$$;

create or replace function public.my_team_id()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.members where id = public.current_member_id();
$$;

-- ─── Pantalla de entrada: qué clubes están cogidos ───────────────────────────

create or replace function public.entry_clubs()
returns table (team_id uuid, owner_name text)
language sql stable security definer set search_path = public as $$
  select team_id, display_name from public.members where team_id is not null;
$$;

-- ─── Elegir un club libre (con el enlace del grupo) ──────────────────────────

create or replace function public.claim_club(p_team uuid, p_name text, p_pin text, p_code text)
returns public.members language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(trim(p_name), '');
  v_first boolean;
  v_me public.members;
begin
  if v_uid is null then
    raise exception 'No se ha podido iniciar la sesión. Vuelve a intentarlo.';
  end if;
  if not public.is_valid_invite(p_code) then
    raise exception 'Para elegir un club libre, entra con el enlace de invitación del grupo.';
  end if;
  if v_name is null then
    raise exception 'Escribe tu nombre.';
  end if;
  if length(v_name) > 40 then
    raise exception 'El nombre es demasiado largo.';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'El PIN tiene que ser de 4 cifras.';
  end if;
  if not exists (select 1 from public.teams where id = p_team) or public.is_system_team(p_team) then
    raise exception 'Ese club no existe.';
  end if;
  if exists (select 1 from public.members where team_id = p_team) then
    raise exception 'Ese club ya tiene dueño. Si es el tuyo, entra con su PIN.';
  end if;
  if exists (select 1 from public.member_devices where user_id = v_uid) then
    raise exception 'Este móvil ya está dentro de la liga con otro club.';
  end if;

  -- El primero en entrar (quien comparte el enlace) es el admin: se queda con la
  -- ficha de admin que ya existía (sin club ni dispositivo), si la hay.
  v_first := not exists (select 1 from public.member_devices);
  if v_first then
    update public.members
       set display_name = v_name, team_id = p_team, pin_hash = crypt(p_pin, gen_salt('bf')),
           is_admin = true, onboarded_at = now(), last_seen_at = now()
     where id = (select id from public.members
                  where is_admin and team_id is null
                    and not exists (select 1 from public.member_devices d where d.member_id = members.id)
                  order by created_at limit 1)
    returning * into v_me;
  end if;

  if v_me.id is null then
    -- El email ya no se usa para entrar; se guarda uno interno porque la columna lo pide.
    insert into public.members (email, display_name, team_id, pin_hash, is_admin, onboarded_at, last_seen_at)
    values ('club-' || p_team || '@cani-league.local', v_name, p_team, crypt(p_pin, gen_salt('bf')), v_first, now(), now())
    returning * into v_me;
  end if;

  insert into public.member_devices (user_id, member_id) values (v_uid, v_me.id);

  return v_me;
end $$;

-- ─── Entrar en un club que ya es tuyo (otro móvil) ───────────────────────────

create or replace function public.enter_club(p_team uuid, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
-- Devuelve 'ok', 'wrong' (PIN incorrecto), 'locked' (demasiados intentos) o 'free' (club sin dueño).
-- No lanza error con el PIN incorrecto para que el contador de intentos se guarde.
declare
  v_uid uuid := auth.uid();
  v_me public.members;
begin
  if v_uid is null then
    raise exception 'No se ha podido iniciar la sesión. Vuelve a intentarlo.';
  end if;
  select * into v_me from public.members where team_id = p_team;
  if v_me.id is null then
    return 'free';
  end if;
  if v_me.pin_locked_until is not null and v_me.pin_locked_until > now() then
    return 'locked';
  end if;
  if v_me.pin_hash is null or v_me.pin_hash <> crypt(coalesce(p_pin, ''), v_me.pin_hash) then
    update public.members
       set pin_failures = case when pin_failures + 1 >= 5 then 0 else pin_failures + 1 end,
           pin_locked_until = case when pin_failures + 1 >= 5 then now() + interval '15 minutes' else null end
     where id = v_me.id;
    return 'wrong';
  end if;

  update public.members set pin_failures = 0, pin_locked_until = null, last_seen_at = now() where id = v_me.id;

  insert into public.member_devices (user_id, member_id) values (v_uid, v_me.id)
  on conflict (user_id) do update set member_id = excluded.member_id, last_seen_at = now();

  return 'ok';
end $$;

-- Un admin pone un PIN nuevo a alguien (si lo ha olvidado).
create or replace function public.set_member_pin(p_member uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede cambiar el PIN de otro.';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'El PIN tiene que ser de 4 cifras.';
  end if;
  update public.members
     set pin_hash = crypt(p_pin, gen_salt('bf')), pin_failures = 0, pin_locked_until = null
   where id = p_member;
end $$;

-- ─── Historial y avisos: el autor y los avisos van por dispositivo ───────────

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
  select * into v_actor from public.members where id = public.current_member_id();

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

  -- Un aviso por cada dispositivo de los miembros de esos clubes, menos quien lo ha hecho.
  if p_notify_title is not null and coalesce(array_length(p_notify_teams, 1), 0) > 0 then
    insert into public.notifications (user_id, activity_id, kind, title, body, link)
    select d.user_id, v_id, p_kind, p_notify_title, p_notify_body, p_link
      from public.members m
      join public.member_devices d on d.member_id = m.id
     where m.team_id = any (p_notify_teams)
       and m.id is distinct from v_actor.id;
  end if;

  return v_id;
end $$;

revoke all on function public.record_activity(text, uuid, uuid, uuid, uuid, text, bigint, jsonb, boolean, uuid[], text, text, text) from public, anon, authenticated;

-- ─── Permisos ────────────────────────────────────────────────────────────────

revoke all on function public.claim_club(uuid, text, text, text) from public, anon;
revoke all on function public.enter_club(uuid, text) from public, anon;
revoke all on function public.set_member_pin(uuid, text) from public, anon;
grant execute on function public.current_member_id() to anon, authenticated;
grant execute on function public.entry_clubs() to anon, authenticated;
grant execute on function public.claim_club(uuid, text, text, text) to authenticated;
grant execute on function public.enter_club(uuid, text) to authenticated;
grant execute on function public.set_member_pin(uuid, text) to authenticated;
