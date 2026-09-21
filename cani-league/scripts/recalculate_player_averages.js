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

const CSV_PATH = 'C:/Users/local_q7y58da/Desktop/statscani.csv';

// Exact attribute groups requested by user
const DEF_ATTRS = [
  'DEFENSE',
  'BALANCE',
  'TOP SPEED',
  'ACCELERATION',
  'JUMP',
  'RESPONSE',
  'AGGRESSION',
  'MENTALITY'
];

const MID_DEF_ATTRS = [
  'DEFENSE',
  'BALANCE',
  'SHORT PASS ACCURACY',
  'LONG PASS ACCURACY',
  'STAMINA',
  'TOP SPEED',
  'ACCELERATION',
  'AGGRESSION',
  'RESPONSE'
];

const MID_ATT_ATTRS = [
  'ATTACK',
  'BALANCE',
  'RESPONSE',
  'STAMINA',
  'AGILITY',
  'DRIBBLE ACCURACY',
  'DRIBBLE SPEED',
  'SHORT PASS ACCURACY',
  'LONG PASS ACCURACY',
  'SHOT ACCURACY',
  'SHOT TECHNIQUE',
  'TOP SPEED',
  'ACCELERATION',
  'AGGRESSION',
  'TECHNIQUE'
];

const ATT_ATTRS = [
  'ATTACK',
  'BALANCE',
  'TOP SPEED',
  'ACCELERATION',
  'SHOT ACCURACY',
  'SHOT TECHNIQUE',
  'STAMINA',
  'AGILITY',
  'DRIBBLE ACCURACY',
  'DRIBBLE SPEED',
  'RESPONSE',
  'AGGRESSION',
  'MENTALITY',
  'TECHNIQUE'
];

const GROUP_TIER_THRESHOLDS = {
  def: { sPlus: 88, s: 85, a: 83, b: 80, c: 76 },
  mid: { sPlus: 90, s: 88, a: 85, b: 82, c: 78 },
  att: { sPlus: 91, s: 88, a: 86, b: 83, c: 79 },
  gk:  { sPlus: 96, s: 91, a: 86, b: 81, c: 75 },
};

const TIER_FIXED_PRICES = {
  'S+': 80_000_000,
  'S':   80_000_000,
  'A':   35_000_000,
  'B':   15_000_000,
  'C':    5_000_000,
  'D':    1_000_000,
};

function getTierForPlayer(rating, positionGroup) {
  const t = GROUP_TIER_THRESHOLDS[positionGroup] || GROUP_TIER_THRESHOLDS.mid;
  if (rating >= t.sPlus) return 'S+';
  if (rating >= t.s) return 'S';
  if (rating >= t.a) return 'A';
  if (rating >= t.b) return 'B';
  if (rating >= t.c) return 'C';
  return 'D';
}

function calcAvg(row, attrs) {
  let sum = 0;
  for (const attr of attrs) {
    const val = Number(row[attr]);
    sum += isNaN(val) ? 0 : val;
  }
  return Math.round(sum / attrs.length);
}

async function main() {
  console.log('================================================================');
  console.log('RECALCULANDO MEDIAS DE JUGADORES POR POSICIÓN Y ELIMINANDO FOTOS');
  console.log('================================================================\n');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }

  // 1. Cargar y parsear CSV
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

    const key = `${cleanName}__${cleanShirt}__${age}`;
    if (!csvMap.has(key)) {
      csvMap.set(key, row);
    }
  }

  console.log(`Cargados ${csvMap.size} jugadores únicos desde ${CSV_PATH}.`);

  // 2. Obtener todos los jugadores de Supabase
  let offset = 0;
  const FETCH_BATCH = 1000;
  const allDbPlayers = [];

  while (true) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .range(offset, offset + FETCH_BATCH - 1);

    if (error) {
      console.error('Error al consultar Supabase:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allDbPlayers.push(...data);
    offset += FETCH_BATCH;
    if (data.length < FETCH_BATCH) break;
  }

  console.log(`Cargados ${allDbPlayers.length} jugadores desde Supabase.`);

  // 3. Procesar cálculos y preparar actualizaciones
  const playersToUpdate = [];
  let unmatchedCount = 0;

  const tierDistribution = {
    def: { 'S+': 0, S: 0, A: 0, B: 0, C: 0, D: 0 },
    mid: { 'S+': 0, S: 0, A: 0, B: 0, C: 0, D: 0 },
    att: { 'S+': 0, S: 0, A: 0, B: 0, C: 0, D: 0 },
    gk:  { 'S+': 0, S: 0, A: 0, B: 0, C: 0, D: 0 }
  };

  for (const p of allDbPlayers) {
    const key = `${p.name}__${p.short_name || ''}__${p.age || ''}`;
    const row = csvMap.get(key);

    const pos = (p.position || '').trim().toUpperCase();
    let newOverall = p.overall ?? 70;
    let group = 'mid';

    if (row) {
      if (['CB', 'LB', 'RB', 'SW'].includes(pos)) {
        group = 'def';
        newOverall = calcAvg(row, DEF_ATTRS);
      } else if (['DMF', 'CMF'].includes(pos)) {
        group = 'mid';
        newOverall = calcAvg(row, MID_DEF_ATTRS);
      } else if (['AMF', 'LMF', 'RMF'].includes(pos)) {
        group = 'mid';
        newOverall = calcAvg(row, MID_ATT_ATTRS);
      } else if (['CF', 'SS', 'LWF', 'RWF'].includes(pos)) {
        group = 'att';
        newOverall = calcAvg(row, ATT_ATTRS);
      } else if (pos === 'GK') {
        group = 'gk';
        // Para porteros, mantener como está
        newOverall = p.overall ?? Math.round(((Number(row['DEFENSE']) || 0) + (Number(row['GOAL KEEPING']) || 0)) / 2);
      }
    } else {
      unmatchedCount++;
      if (['CB', 'LB', 'RB', 'SW'].includes(pos)) group = 'def';
      else if (['CF', 'SS', 'LWF', 'RWF'].includes(pos)) group = 'att';
      else if (pos === 'GK') group = 'gk';
      else group = 'mid';
    }

    const tier = getTierForPlayer(newOverall, group);
    tierDistribution[group][tier]++;

    const fixedPrice = TIER_FIXED_PRICES[tier] || 1_000_000;

    playersToUpdate.push({
      ...p,
      overall: newOverall,
      market_value: fixedPrice,
      transfer_price: fixedPrice,
      photo_url: null // Eliminar fotos reales de todos los futbolistas
    });
  }

  console.log(`\nPreparados ${playersToUpdate.length} jugadores para actualizar (Sin coincidencias CSV: ${unmatchedCount}).`);
  console.log('\nDistribución de Tiers resultante:');
  console.log(tierDistribution);

  // Muestra de cambios
  console.log('\nMuestra de 10 jugadores actualizados:');
  for (let i = 0; i < Math.min(10, playersToUpdate.length); i++) {
    const orig = allDbPlayers.find(x => x.id === playersToUpdate[i].id);
    const grp = ['CB', 'LB', 'RB', 'SW'].includes(playersToUpdate[i].position) ? 'def' :
                pos => ['CF', 'SS', 'LWF', 'RWF'].includes(pos) ? 'att' :
                pos => pos === 'GK' ? 'gk' : 'mid';
    console.log(
      `  ${playersToUpdate[i].name} (${playersToUpdate[i].position}): ` +
      `Media ${orig.overall} -> ${playersToUpdate[i].overall} | ` +
      `Precio €${orig.market_value?.toLocaleString('es-ES')} -> €${playersToUpdate[i].market_value?.toLocaleString('es-ES')} | ` +
      `Foto: eliminada (null)`
    );
  }

  // 4. Batch upsert en Supabase
  console.log('\nGuardando cambios en Supabase...');
  const UPSERT_BATCH = 100;
  let saved = 0;
  for (let i = 0; i < playersToUpdate.length; i += UPSERT_BATCH) {
    const chunk = playersToUpdate.slice(i, i + UPSERT_BATCH);
    const { error: upsertErr } = await supabase.from('players').upsert(chunk);
    if (upsertErr) {
      console.error(`\nError en lote ${i}:`, upsertErr);
      process.exit(1);
    }
    saved += chunk.length;
    process.stdout.write(`\rProgreso: ${saved} / ${playersToUpdate.length} jugadores guardados en Supabase.`);
  }

  console.log(`\n\n✅ ¡COMPLETADO CON ÉXITO!`);
  console.log(`Total de jugadores actualizados: ${saved}`);
  console.log(`- Nuevas medias calculadas según las 4 agrupaciones de campo.`);
  console.log(`- Porteros conservados intactos.`);
  console.log(`- Mediocentros calculados por rol y agrupados en el apartado común.`);
  console.log(`- Tiers calibrados y precios fijos actualizados.`);
  console.log(`- Todas las fotos reales eliminadas de la base de datos (photo_url = null).`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
