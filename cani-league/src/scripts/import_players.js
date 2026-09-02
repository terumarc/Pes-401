/*
  import_players.js
  Script to import real player data from statscani.csv into Supabase,
  excluding placeholder/dummy rows (<Unused XXXX> and <Edited XXX>).
  Usage: node src/scripts/import_players.js
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tqbagczpvjnpvwmxjwdx.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_38OfXImVYsxdVmS7j3kLCg_KyT3pTgl';
const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_PATH = path.resolve(__dirname, '../../../../Desktop/statscani.csv');

function calculatePlayerPrice(overall) {
  if (!overall) return 0;
  const basePrice = 1_000_000;
  const multiplier = 1.24;
  let price = basePrice * Math.pow(multiplier, overall - 70);
  if (price > 10_000_000) {
    price = Math.round(price / 500_000) * 500_000;
  } else if (price > 1_000_000) {
    price = Math.round(price / 100_000) * 100_000;
  } else {
    price = Math.round(price / 10_000) * 10_000;
  }
  return price;
}

function mapPosition(regPos, favouredSide) {
  const posNum = parseInt(regPos, 10);
  const side = (favouredSide || '').toUpperCase();
  switch (posNum) {
    case 0: return 'GK';
    case 2:
    case 3: return 'CB';
    case 4: return side === 'L' ? 'LB' : side === 'R' ? 'RB' : 'CB';
    case 5: return 'DMF';
    case 6: return side === 'L' ? 'LMF' : side === 'R' ? 'RMF' : 'CMF';
    case 7: return 'CMF';
    case 8: return side === 'R' ? 'RMF' : 'LMF';
    case 9: return 'AMF';
    case 10: return side === 'R' ? 'RWF' : 'LWF';
    case 11: return 'SS';
    case 12: return 'CF';
    default: return 'CF';
  }
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < lines[i].length; c++) {
      const ch = lines[i][c];
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
    rows.push(row);
  }
  return { headers, rows };
}

async function main() {
  console.log('=== SYNCING PLAYERS TO SUPABASE (EXCLUDING UNUSED PLACEHOLDERS) ===');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV file not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH);
  const content = raw.toString('latin1');
  const { rows } = parseCSV(content);

  const { data: leagues } = await supabase.from('leagues').select('*').limit(1);
  const leagueId = leagues[0].id;

  let { data: freeAgentsTeam } = await supabase.from('teams').select('*').eq('name', 'Agentes Libres').maybeSingle();
  if (!freeAgentsTeam) {
    const { data: created } = await supabase.from('teams').insert({
      league_id: leagueId,
      name: 'Agentes Libres',
      short_name: 'LIB',
      owner_name: 'Mercado',
      primary_color: '#64748B',
      secondary_color: '#0F172A',
      budget: 0
    }).select().single();
    freeAgentsTeam = created;
  }

  const { count: totalInDb } = await supabase.from('players').select('*', { count: 'exact', head: true });
  console.log(`Current players in DB: ${totalInDb}`);
}

main().catch(console.error);
