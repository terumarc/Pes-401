-- 016 · Si se borra el resultado de un partido, sus cartas se anulan
--
-- Al volver un partido a pendiente (o borrarlo), las cartas que salieron con él
-- desaparecen y el dinero vuelve a donde estaba: el club devuelve lo que ganó
-- (o recupera lo que perdió) y los clubes implicados recuperan o devuelven su parte.
-- Corregir el marcador sin borrarlo no toca las cartas.

create or replace function public.undo_match_cards(p_match uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  d public.card_draws;
  t record;
  n integer := 0;
begin
  for d in select * from public.card_draws where match_id = p_match for update loop
    -- amount es lo que el club ganó (+) o perdió (−) en total; transfers, lo que movió con cada club.
    update public.teams set budget = budget - d.amount where id = d.team_id;
    for t in select (x->>'team_id')::uuid as team_id, (x->>'amount')::bigint as amount
               from jsonb_array_elements(d.transfers) x loop
      update public.teams set budget = budget + t.amount where id = t.team_id;
    end loop;

    -- Fuera del historial y de los avisos.
    delete from public.notifications
     where activity_id in (select id from public.activity_log where kind = 'card' and payload->>'draw_id' = d.id::text);
    delete from public.activity_log where kind = 'card' and payload->>'draw_id' = d.id::text;
    -- El aviso de «tienes una carta» sobra si al club no le queda ninguna boca abajo.
    if not exists (
      select 1 from public.card_draws o where o.team_id = d.team_id and o.status = 'pending' and o.id <> d.id
    ) then
      delete from public.notifications n2
       using public.member_devices md, public.members m
       where n2.kind = 'card_pending' and n2.user_id = md.user_id and md.member_id = m.id and m.team_id = d.team_id;
    end if;

    delete from public.card_draws where id = d.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.undo_match_cards(uuid) from public, anon, authenticated;

create or replace function public.matches_undo_cards()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.undo_match_cards(old.id);
    return old;
  end if;
  if old.played and not coalesce(new.played, false) then
    perform public.undo_match_cards(new.id);
  end if;
  return new;
end $$;

drop trigger if exists matches_undo_cards on public.matches;
create trigger matches_undo_cards
  before update of played or delete on public.matches
  for each row execute function public.matches_undo_cards();

-- Cartas que ya salieron con partidos cuyo resultado se borró antes de este cambio.
select public.undo_match_cards(m.id)
  from public.matches m
 where not m.played and exists (select 1 from public.card_draws d where d.match_id = m.id);

-- Avisos de carta pendiente de clubes que ya no tienen ninguna boca abajo.
delete from public.notifications n
 using public.member_devices md, public.members m
 where n.kind = 'card_pending' and n.user_id = md.user_id and md.member_id = m.id
   and not exists (select 1 from public.card_draws d where d.team_id = m.team_id and d.status = 'pending');
