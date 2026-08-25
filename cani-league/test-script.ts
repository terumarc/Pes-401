import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data: leagues } = await supabase.from('leagues').select('*').limit(1);
  const leagueId = leagues[0].id;
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', leagueId);
  const teamIds = teams.map(t => t.id);

  const teamList = [...teamIds];
  if (teamList.length % 2 !== 0) teamList.push("BYE");

  const half = teamList.length / 2;
  const rounds = teamList.length - 1;
  const fixed = teamList[0];
  const rotating = teamList.slice(1);
  const inserts: any[] = [];

  for (let round = 0; round < rounds; round++) {
    const matchday = round + 1;
    const pairs: [string, string][] = [];

    pairs.push([fixed, rotating[round % (teamList.length - 1)]]);
    for (let i = 1; i < half; i++) {
        const home = rotating[(round + i) % (teamList.length - 1)];
        const away = rotating[(round + teamList.length - 1 - i) % (teamList.length - 1)];
        pairs.push([home, away]);
    }

    for (const [home, away] of pairs) {
        if (home === "BYE" || away === "BYE") continue;

        inserts.push({ league_id: leagueId, home_team_id: home, away_team_id: away, matchday, round: 1, home_goals: null, away_goals: null, played: false, played_at: null });
        inserts.push({ league_id: leagueId, home_team_id: away, away_team_id: home, matchday: rounds + matchday, round: 2, home_goals: null, away_goals: null, played: false, played_at: null });
    }
  }

  const { data, error } = await supabase.from("matches").insert(inserts).select();
  if (error) console.error("ERROR::", JSON.stringify(error, null, 2));
  else console.log("SUCCESS, inserted", data.length);
}
run();
