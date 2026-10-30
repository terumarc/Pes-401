-- 016 · Fichajes de invierno: pagan media temporada
--
-- Se guarda cuándo llegó cada jugador a su club. Al cerrar la temporada, a quien
-- llegó después de acabar la primera vuelta (mercado de invierno o más tarde) se le
-- cobra la mitad del sueldo. Los que ya estaban (fecha vacía) pagan entero, como antes.
-- Solo añade cosas: la app de antes sigue funcionando igual.

alter table public.players
  add column if not exists joined_team_at timestamptz;

create or replace function public.players_track_joined_team()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.team_id is distinct from old.team_id then
    new.joined_team_at := now();
  end if;
  return new;
end $$;

drop trigger if exists players_track_joined_team on public.players;
create trigger players_track_joined_team
  before insert or update of team_id on public.players
  for each row execute function public.players_track_joined_team();
