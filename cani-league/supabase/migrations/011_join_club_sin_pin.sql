-- 011 · Entrar eligiendo club, sin correo, sin código y sin PIN
--
-- Con el enlace de invitación del grupo, cada uno elige su club y queda guardado
-- en ese móvil. Si el club ya tiene dueño (otro móvil del mismo amigo, o tras
-- borrar datos), se entra en él igual, y a su dueño y a los admins les llega un
-- aviso para que se note si alguien entra con un club que no es el suyo.
-- Sin el enlace, solo se ve la lista: no se puede entrar.

create or replace function public.join_club(p_team uuid, p_name text, p_code text)
returns public.members language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := nullif(trim(p_name), '');
  v_me   public.members;
  v_first boolean;
  v_team text;
begin
  if v_uid is null then
    raise exception 'No se ha podido abrir la sesión en este móvil. Vuelve a intentarlo.';
  end if;
  if not public.is_valid_invite(p_code) then
    raise exception 'Para entrar, abre el enlace de invitación del grupo.';
  end if;
  if not exists (select 1 from public.teams where id = p_team) or public.is_system_team(p_team) then
    raise exception 'Ese club no existe.';
  end if;
  if v_name is not null and length(v_name) > 40 then
    raise exception 'El nombre es demasiado largo.';
  end if;
  v_team := public.team_name(p_team);

  select * into v_me from public.members where team_id = p_team;

  if v_me.id is null then
    -- Club libre: se queda con él quien lo elige.
    if v_name is null then
      raise exception 'Escribe tu nombre.';
    end if;

    -- El primero en entrar es el admin que ya existía sin club (quien comparte el enlace).
    v_first := not exists (select 1 from public.member_devices);
    if v_first then
      update public.members
         set display_name = v_name, team_id = p_team, onboarded_at = now(), last_seen_at = now()
       where id = (select id from public.members
                    where is_admin and team_id is null
                      and not exists (select 1 from public.member_devices d where d.member_id = members.id)
                    order by created_at limit 1)
      returning * into v_me;
    end if;

    if v_me.id is null then
      insert into public.members (email, display_name, team_id, is_admin, onboarded_at, last_seen_at)
      values ('club-' || p_team || '@cani-league.local', v_name, p_team, v_first, now(), now())
      returning * into v_me;
    end if;
  else
    -- Club con dueño: este móvil entra como él y se avisa al dueño y a los admins.
    update public.members set last_seen_at = now() where id = v_me.id;

    insert into public.notifications (user_id, kind, title, body, link)
    select distinct d.user_id, 'device_added', 'Nuevo móvil en ' || v_team,
           'Alguien ha entrado como ' || v_team || ' en otro móvil. Si no has sido tú, avisa a un admin.',
           '/movimientos'
      from public.member_devices d
      join public.members m on m.id = d.member_id
     where (m.id = v_me.id or m.is_admin)
       and d.user_id <> v_uid;
  end if;

  insert into public.member_devices (user_id, member_id) values (v_uid, v_me.id)
  on conflict (user_id) do update set member_id = excluded.member_id, last_seen_at = now();

  return v_me;
end $$;

-- Un admin saca un móvil de la liga (por si alguien entra con un club que no es el suyo).
create or replace function public.remove_member_devices(p_member uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto.';
  end if;
  delete from public.member_devices where member_id = p_member and user_id <> auth.uid();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.join_club(uuid, text, text) from public, anon;
revoke all on function public.remove_member_devices(uuid) from public, anon;
grant execute on function public.join_club(uuid, text, text) to authenticated;
grant execute on function public.remove_member_devices(uuid) to authenticated;
