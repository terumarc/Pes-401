/*
  import_players.js
  Script to import real player data from a CSV file into the Supabase database.
  It deletes all existing players (assumed placeholders) and bulk‑inserts the new ones.
  Usage: node import_players.js
*/

const fs = require('fs');
const path = require('path');
// Absolute path to the Supabase client in the project
const { createClient } = require('C:/Users/local_q7y58da/.gemini/antigravity/scratch/Pes-401/cani-league/src/lib/supabase/server');

// Path to the CSV file (adjust if moved)
const CSV_PATH = 'C:/Users/local_q7y58da/Desktop/statscani.csv';

/** Simple CSV parser – splits on commas, trims whitespace, and handles quoted values. */
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx]; });
    rows.push(row);
  }
  return { headers, rows };
}

/** Compute the average of numeric stat columns (excluding overall and market_value). */
function computeAverageStats(row, excluded = ['overall', 'market_value']) {
  let sum = 0;
  let count = 0;
  for (const key of Object.keys(row)) {
    if (excluded.includes(key)) continue;
    const val = Number(row[key]);
    if (!isNaN(val)) { sum += val; count++; }
  }
  return count > 0 ? Math.round(sum / count) : null;
}

async function main() {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const { rows } = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const supabase = await createClient();
  // Delete existing players
  const { data: existing, error: fetchErr } = await supabase.from('players').select('id');
  if (fetchErr) throw fetchErr;
  if (existing && existing.length > 0) {
    const ids = existing.map(p => p.id);
    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error: delErr } = await supabase.from('players').delete().in('id', chunk);
      if (delErr) throw delErr;
    }
    console.log(`Deleted ${ids.length} placeholder players`);
  } else {
    console.log('No existing players to delete');
  }

  // Prepare player objects for insertion
  const players = rows.map(row => {
    const overall = Number(row['overall']) || null;
    return {
      team_id: row['team_id'] || null,
      name: row['name'] || 'Unknown',
      short_name: row['short_name'] || null,
      photo_url: row['photo_url'] || null,
      position: row['position'] || 'CF',
      age: row['age'] ? Number(row['age']) : null,
      nationality: row['nationality'] || null,
      overall: overall,
      speed: row['speed'] ? Number(row['speed']) : null,
      acceleration: row['acceleration'] ? Number(row['acceleration']) : null,
      shooting: row['shooting'] ? Number(row['shooting']) : null,
      passing: row['passing'] ? Number(row['passing']) : null,
      dribbling: row['dribbling'] ? Number(row['dribbling']) : null,
      defending: row['defending'] ? Number(row['defending']) : null,
      physical: row['physical'] ? Number(row['physical']) : null,
      market_value: row['market_value'] ? Number(row['market_value']) : 0,
      transfer_price: row['transfer_price'] ? Number(row['transfer_price']) : 0,
      available_in_market: true,
      // average_stats: computeAverageStats(row) // uncomment if column exists
    };
  });

  // Bulk insert in chunks (Supabase max 1000 rows per request)
  const CHUNK = 500;
  for (let i = 0; i < players.length; i += CHUNK) {
    const chunk = players.slice(i, i + CHUNK);
    const { data, error } = await supabase.from('players').insert(chunk);
    if (error) throw error;
    console.log(`Inserted ${data.length} players (batch ${i / CHUNK + 1})`);
  }

  console.log('Import complete');
}

main().catch(e => {
  console.error('Error during import:', e);
  process.exit(1);
});
