-- 009 · Invitación por enlace y "elige tu club"
--
-- Un admin comparte un enlace (/unirse/<código>). Quien lo abre y pone su email
-- entra en la lista de la liga sin que nadie tenga que añadirle a mano.
-- La primera vez, elige su nombre y un club que aún no tenga dueño.

create table if not exists public.league_invites (
  code        text primary key,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.members(id) on delete set null,
  revoked_at  timestamptz
);

alter table public.league_invites enable row level security;

create policy "invites: admins" on public.league_invites
  for select to authenticated using (public.is_admin());

-- ¿Vale este código? (se usa antes de mandar el correo)
create or replace function public.is_valid_invite(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.league_invites where code = p_code and revoked_at is null);
$$;

-- Con un código válido, el email entra en la lista (sin club ni admin).
create or replace function public.join_with_code(p_email text, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return false;
  end if;
  if not public.is_valid_invite(p_code) then
    return false;
  end if;
  insert into public.members (email, display_name)
  values (v_email, initcap(replace(split_part(v_email, '@', 1), '.', ' ')))
  on conflict ((lower(email))) do nothing;
  return true;
end $$;

-- Un admin crea un enlace nuevo; el anterior deja de valer.
create or replace function public.new_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede crear enlaces de invitación.';
  end if;
  update public.league_invites set revoked_at = now() where revoked_at is null;
  insert into public.league_invites (code, created_by)
  values (v_code, (select id from public.members where user_id = auth.uid()));
  return v_code;
end $$;

-- Primera entrada: nombre y club. Un club solo puede tener un dueño, y quien ya
-- tiene club no se lo cambia solo (eso lo hace un admin desde Usuarios).
create or replace function public.complete_profile(p_name text, p_team uuid)
returns public.members language plpgsql security definer set search_path = public as $$
declare
  v_me public.members;
  v_name text := nullif(trim(p_name), '');
begin
  select * into v_me from public.members where user_id = auth.uid();
  if v_me.id is null then
    raise exception 'Tienes que entrar en la app para hacer esto.';
  end if;
  if v_name is not null and length(v_name) > 40 then
    raise exception 'El nombre es demasiado largo.';
  end if;

  if p_team is not null and v_me.team_id is distinct from p_team then
    if v_me.team_id is not null and not v_me.is_admin then
      raise exception 'Ya tienes club. Para cambiarlo, pídeselo a un admin.';
    end if;
    if not exists (select 1 from public.teams where id = p_team) or public.is_system_team(p_team) then
      raise exception 'Ese club no existe.';
    end if;
    if exists (select 1 from public.members where team_id = p_team and id <> v_me.id) then
      raise exception 'Ese club ya tiene dueño. Elige otro.';
    end if;
  end if;

  update public.members
     set display_name = coalesce(v_name, display_name),
         team_id = coalesce(p_team, team_id)
   where id = v_me.id
  returning * into v_me;
  return v_me;
end $$;

revoke all on function public.join_with_code(text, text) from public;
revoke all on function public.new_invite_code() from public, anon;
revoke all on function public.complete_profile(text, uuid) from public, anon;
grant execute on function public.is_valid_invite(text) to anon, authenticated;
grant execute on function public.join_with_code(text, text) to anon, authenticated;
grant execute on function public.new_invite_code() to authenticated;
grant execute on function public.complete_profile(text, uuid) to authenticated;

-- Primer enlace, para que esté listo desde el principio.
insert into public.league_invites (code, created_by)
select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
       (select id from public.members where lower(email) = 'terumarc@gmail.com')
where not exists (select 1 from public.league_invites where revoked_at is null);

-- Se marca cuándo alguien ha pasado por la bienvenida (para no volver a enseñársela,
-- también a un admin que decide no tener club).
alter table public.members add column if not exists onboarded_at timestamptz;
-- complete_profile además rellena onboarded_at (aplicado como 009b_onboarded).
