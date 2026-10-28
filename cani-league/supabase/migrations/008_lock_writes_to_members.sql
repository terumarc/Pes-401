-- 008 · Solo los miembros con sesión iniciada pueden escribir
--
-- ⚠️ Aplicar SOLO cuando la rama feat/usuarios-acceso esté en main y desplegada.
-- La versión anterior de la app escribe sin sesión y dejaría de poder guardar nada.
--
-- Leer sigue abierto (la app lee datos públicos con la clave anónima y caché).
-- Qué equipo puede hacer qué lo comprueba la app en el servidor; aquí se
-- asegura que nadie de fuera de la lista de miembros pueda tocar los datos.

do $$
declare
  t text;
  p record;
  tables text[] := array[
    'leagues', 'teams', 'players', 'league_standings', 'matches', 'transfers',
    'team_trophies', 'trophy_prizes', 'contract_salaries', 'season_closures',
    'contract_events', 'match_goals', 'cup_ties', 'seasons', 'transfer_offers'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "lectura" on public.%I for select to anon, authenticated using (true)', t);
    execute format(
      'create policy "miembros: crear" on public.%I for insert to authenticated with check (public.is_member())', t);
    execute format(
      'create policy "miembros: editar" on public.%I for update to authenticated using (public.is_member()) with check (public.is_member())', t);
    execute format(
      'create policy "miembros: borrar" on public.%I for delete to authenticated using (public.is_member())', t);
  end loop;
end $$;
