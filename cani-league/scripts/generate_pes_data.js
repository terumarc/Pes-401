const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

const CSV_PATH = 'C:/Users/local_q7y58da/Desktop/statscani.csv';

const ATTR_KEYS = [
  'attack',
  'defense',
  'balance',
  'stamina',
  'top_speed',
  'acceleration',
  'response',
  'agility',
  'dribble_accuracy',
  'dribble_speed',
  'short_pass_accuracy',
  'short_pass_speed',
  'long_pass_accuracy',
  'long_pass_speed',
  'shot_accuracy',
  'shot_power',
  'shot_technique',
  'free_kick_accuracy',
  'swerve',
  'heading',
  'jump',
  'technique',
  'aggression',
  'mentality',
  'goal_keeping',
  'team_work'
];

const CSV_COLS = [
  'ATTACK',
  'DEFENSE',
  'BALANCE',
  'STAMINA',
  'TOP SPEED',
  'ACCELERATION',
  'RESPONSE',
  'AGILITY',
  'DRIBBLE ACCURACY',
  'DRIBBLE SPEED',
  'SHORT PASS ACCURACY',
  'SHORT PASS SPEED',
  'LONG PASS ACCURACY',
  'LONG PASS SPEED',
  'SHOT ACCURACY',
  'SHOT POWER',
  'SHOT TECHNIQUE',
  'FREE KICK ACCURACY',
  'SWERVE',
  'HEADING',
  'JUMP',
  'TECHNIQUE',
  'AGGRESSION',
  'MENTALITY',
  'GOAL KEEPING',
  'TEAM WORK'
];

async function generate() {
  const raw = fs.readFileSync(CSV_PATH);
  const content = raw.toString('latin1');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const headers = lines[0].split(',').map(h => h.trim());

  const csvMap = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx]; });
    const cleanName = (row['NAME'] || '').replace(/[\x00-\x1F\x7F]/g, '').trim();
    const cleanShirt = (row['SHIRT_NAME'] || '').replace(/[\x00-\x1F\x7F]/g, '').trim();
    const age = Number(row['AGE']) || null;

    const statsArray = CSV_COLS.map(c => Number(row[c]) || 0);
    const key = `${cleanName}__${cleanShirt}__${age}`;
    csvMap.set(key, statsArray);
    csvMap.set(cleanName.toLowerCase(), statsArray);
  }

  let offset = 0;
  let allDb = [];
  while (true) {
    const { data } = await supabase.from('players').select('id, name, short_name, age').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allDb.push(...data);
    offset += 1000;
  }

  const byId = {};
  for (const p of allDb) {
    const key = `${p.name}__${p.short_name || ''}__${p.age || ''}`;
    const stats = csvMap.get(key) || csvMap.get(p.name.toLowerCase());
    if (stats) {
      byId[p.id] = stats;
    }
  }

  console.log(`Matched ${Object.keys(byId).length} out of ${allDb.length} players.`);

  if (!fs.existsSync('src/data')) {
    fs.mkdirSync('src/data', { recursive: true });
  }

  const jsonStr = JSON.stringify(byId);
  fs.writeFileSync('src/data/pes_stats.json', jsonStr);
  console.log(`Saved src/data/pes_stats.json (${(jsonStr.length / 1024).toFixed(1)} KB)`);
}

generate();
