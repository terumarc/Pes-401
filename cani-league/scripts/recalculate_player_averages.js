const fs = require('fs');
const path = require('path');
const { createClient } = require('C:/Users/local_q7y58da/.gemini/antigravity/scratch/Pes-401/cani-league/node_modules/@supabase/supabase-js');

const envPath = 'C:/Users/local_q7y58da/.gemini/antigravity/scratch/Pes-401/cani-league/.env.local';
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

const CSV_PATH = 'C:/Users/local_q7y58da/Desktop/statscani.csv';

// The 26 exact PES attributes specified by user
const ATTRS_26 = [
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

function calculate26AttrAvg(row) {
  let sum = 0;
  let count = 0;
  for (const attr of ATTRS_26) {
    const val = Number(row[attr]);
    if (!isNaN(val)) {
      sum += val;
      count++;
    }
  }
  return count > 0 ? Math.round(sum / count) : null;
}

async function main() {
  console.log('=== RECALCULATING PLAYER OVERALL RATINGS USING 26 ATTRIBUTES ===');
  console.log(`Attributes (${ATTRS_26.length}):\n${ATTRS_26.join(', ')}\n`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }

  // 1. Read and parse CSV
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
    const avg = calculate26AttrAvg(row);

    const key = `${cleanName}__${cleanShirt}__${age}`;
    if (!csvMap.has(key)) {
      csvMap.set(key, avg);
    }
  }

  console.log(`Loaded ${csvMap.size} distinct players from CSV.`);

  // 2. Fetch all players from DB in batches and update them
  let offset = 0;
  const FETCH_BATCH = 1000;
  const allDbPlayers = [];

  while (true) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .range(offset, offset + FETCH_BATCH - 1);

    if (error) {
      console.error('Fetch error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allDbPlayers.push(...data);
    offset += FETCH_BATCH;
    if (data.length < FETCH_BATCH) break;
  }

  console.log(`Fetched ${allDbPlayers.length} total players from Supabase.`);

  // 3. Prepare updates
  let updatedCount = 0;
  let skippedCount = 0;
  const playersToUpdate = [];

  for (const p of allDbPlayers) {
    const key = `${p.name}__${p.short_name || ''}__${p.age || ''}`;
    const newOverall = csvMap.get(key);

    if (newOverall !== undefined && newOverall !== null) {
      const newMarketValue = calculatePlayerPrice(newOverall);
      const newTransferPrice = Math.round(newMarketValue * 1.1);

      playersToUpdate.push({
        ...p,
        overall: newOverall,
        market_value: newMarketValue,
        transfer_price: newTransferPrice
      });
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`Prepared ${playersToUpdate.length} updates (${skippedCount} unmatched/skipped).`);

  // Print sample updates
  console.log('\nSample Updates (first 10):');
  for (let i = 0; i < Math.min(10, playersToUpdate.length); i++) {
    const orig = allDbPlayers.find(p => p.id === playersToUpdate[i].id);
    console.log(
      `  ${playersToUpdate[i].name} (${playersToUpdate[i].position}): ` +
      `Overall ${orig.overall} -> ${playersToUpdate[i].overall} | ` +
      `Value €${orig.market_value.toLocaleString()} -> €${playersToUpdate[i].market_value.toLocaleString()}`
    );
  }

  // 4. Batch upsert into Supabase
  const UPSERT_BATCH = 100;
  let saved = 0;
  for (let i = 0; i < playersToUpdate.length; i += UPSERT_BATCH) {
    const chunk = playersToUpdate.slice(i, i + UPSERT_BATCH);
    const { error: upsertErr } = await supabase.from('players').upsert(chunk);
    if (upsertErr) {
      console.error(`Error upserting batch at index ${i}:`, upsertErr);
      process.exit(1);
    }
    saved += chunk.length;
    process.stdout.write(`\rProgress: ${saved} / ${playersToUpdate.length} players updated`);
  }

  console.log(`\n\nDONE! Successfully updated ${saved} players with their new 26-attribute average!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
