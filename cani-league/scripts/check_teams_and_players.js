const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (!urlMatch || !keyMatch) {
  console.error('Could not find Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, league_id, budget');

  if (teamsErr) {
    console.error('Error fetching teams:', teamsErr);
    return;
  }

  console.log('=== TEAMS ===');
  for (const t of teams) {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', t.id);
    console.log(`Team: "${t.name}" (ID: ${t.id}) - Players: ${count} - Budget: ${t.budget}`);
  }

  const { count: nullTeamPlayers } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .is('team_id', null);
  console.log(`Players with team_id IS NULL: ${nullTeamPlayers}`);

  const { count: marketAvailable } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('available_in_market', true);
  console.log(`Players with available_in_market = true: ${marketAvailable}`);

  const { count: totalPlayers } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });
  console.log(`Total players: ${totalPlayers}`);
}

inspect();
