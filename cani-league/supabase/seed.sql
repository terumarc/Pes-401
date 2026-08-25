-- Seed: Cani League 2026
-- Fictional demo players only (no real players)

do $$
declare
  v_league_id uuid;
  v_team_ids uuid[] := array[]::uuid[];
  v_team_id uuid;
  v_names text[] := array[
    'Cum Makers',
    'Macedonios',
    'UD Chamba',
    'All The Aces',
    'Flaming Donuts',
    'Charlies XI',
    'Harris United'
  ];
  v_shorts text[] := array['CUM', 'MAC', 'UDC', 'ACE', 'FD', 'CXI', 'HAR'];
  v_primary text[] := array[
    '#1B6B4A',
    '#1E3A5F',
    '#8B2942',
    '#C4A035',
    '#D35400',
    '#2C3E50',
    '#4A5568'
  ];
  v_secondary text[] := array[
    '#0C1222',
    '#F5F7FA',
    '#F5F7FA',
    '#0C1222',
    '#0C1222',
    '#F5F7FA',
    '#F5F7FA'
  ];
  i int;
begin
  insert into public.leagues (name, season)
  values ('Cani League', '2026')
  returning id into v_league_id;

  for i in 1..array_length(v_names, 1) loop
    insert into public.teams (
      league_id,
      name,
      short_name,
      owner_name,
      primary_color,
      secondary_color,
      budget
    )
    values (
      v_league_id,
      v_names[i],
      v_shorts[i],
      null,
      v_primary[i],
      v_secondary[i],
      100000000
    )
    returning id into v_team_id;

    v_team_ids := array_append(v_team_ids, v_team_id);

    insert into public.league_standings (league_id, team_id, position, previous_position)
    values (v_league_id, v_team_id, i, i);
  end loop;

  insert into public.players (
    team_id, name, short_name, position, age, nationality, overall,
    speed, acceleration, shooting, passing, dribbling, defending, physical,
    market_value, transfer_price, available_in_market
  ) values
    (v_team_ids[1], 'Nico Vargas', 'Vargas', 'CMF', 24, 'ESP', 78, 74, 76, 68, 81, 77, 62, 70, 12000000, 14000000, false),
    (v_team_ids[1], 'Omar Kline', 'Kline', 'CF', 27, 'NED', 81, 82, 84, 80, 65, 78, 40, 75, 18000000, 20000000, true),
    (v_team_ids[1], 'Leo Prado', 'Prado', 'GK', 29, 'ARG', 76, 45, 48, 20, 55, 40, 78, 72, 8000000, 9000000, false),

    (v_team_ids[2], 'Iker Solano', 'Solano', 'CB', 26, 'ESP', 79, 68, 70, 45, 62, 55, 82, 84, 15000000, 16000000, false),
    (v_team_ids[2], 'Theo Rivas', 'Rivas', 'AMF', 22, 'POR', 77, 76, 79, 74, 80, 82, 48, 60, 14000000, 15500000, true),

    (v_team_ids[3], 'Bruno Mena', 'Mena', 'DMF', 28, 'URU', 80, 70, 72, 55, 78, 68, 81, 83, 16000000, 17500000, false),
    (v_team_ids[3], 'Kai Ortega', 'Ortega', 'LWF', 23, 'MEX', 75, 86, 88, 70, 68, 80, 35, 62, 11000000, 12500000, false),

    (v_team_ids[4], 'Sam Quill', 'Quill', 'SS', 25, 'ENG', 82, 80, 81, 83, 76, 84, 42, 68, 22000000, 25000000, true),
    (v_team_ids[4], 'Jonas Berg', 'Berg', 'RB', 27, 'SWE', 74, 78, 77, 50, 70, 72, 72, 76, 9000000, 10000000, false),

    (v_team_ids[5], 'Felix Dorn', 'Dorn', 'CF', 24, 'GER', 79, 83, 85, 78, 62, 75, 38, 80, 17000000, 19000000, false),
    (v_team_ids[5], 'Mateo Cruz', 'Cruz', 'CMF', 21, 'CHI', 73, 72, 74, 65, 76, 74, 58, 68, 7000000, 8000000, true),

    (v_team_ids[6], 'Harry Voss', 'Voss', 'CB', 30, 'SCO', 77, 64, 66, 40, 60, 52, 80, 85, 10000000, 11000000, false),
    (v_team_ids[6], 'Eli Park', 'Park', 'AMF', 26, 'KOR', 80, 75, 78, 76, 83, 81, 50, 65, 19000000, 21000000, false),

    (v_team_ids[7], 'Noah Hale', 'Hale', 'GK', 28, 'USA', 78, 42, 45, 18, 58, 38, 80, 74, 11000000, 12000000, false),
    (v_team_ids[7], 'Rico Santos', 'Santos', 'RWF', 22, 'BRA', 76, 88, 90, 72, 70, 83, 32, 60, 13000000, 14500000, true);
end $$;
