/**
 * scripts/fetch_player_photos.js
 * 
 * Buscador masivo de fotos de jugadores para PES / Cani League Manager.
 * Con validación estricta de nombres, reintento inteligente ante HTTP 429
 * y soporte para TheSportsDB y Wikipedia (EN / ES).
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar credenciales desde .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: No se encontró .env.local');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (!urlMatch || !keyMatch) {
  console.error('Error: Credenciales incompletas en .env.local');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Parámetros CLI
const args = process.argv.slice(2);
const isAll = !args.includes('--active');
const isForce = args.includes('--force');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const WIKI_UA = 'CaniLeagueManager/2.0 (https://canileague.local; contact@canileague.es)';

// 3. Diccionario de leyendas y alias de PES
const KNOWN_ALIASES = {
  'G. Neville': 'Gary Neville',
  'R. Krol': 'Ruud Krol',
  'R.  Krol': 'Ruud Krol',
  'I. Rakitic': 'Ivan Rakitic',
  'D. Alves': 'Dani Alves',
  'Y. Toure': 'Yaya Toure',
  'S. Busquets': 'Sergio Busquets',
  'D. Milito': 'Diego Milito',
  'A. Panenka': 'Antonin Panenka',
  'Z. Czibor': 'Zoltan Czibor',
  'Falcao': 'Radamel Falcao',
  'Pirlo': 'Andrea Pirlo',
  'Gudjohnsen': 'Eidur Gudjohnsen',
  'Camacho': 'Jose Antonio Camacho',
  'Adriano': 'Adriano Leite Ribeiro',
  'Crespo': 'Hernan Crespo',
  'Klinsmann': 'Jurgen Klinsmann',
  'Voller': 'Rudi Voller',
  'Brehme': 'Andreas Brehme',
  'Bonucci': 'Leonardo Bonucci',
  'Evra': 'Patrice Evra',
  'Ramires': 'Ramires',
  'Gento': 'Paco Gento',
  'Seaman': 'David Seaman',
  'T. Adams': 'Tony Adams',
  'Tassotti': 'Mauro Tassotti',
  'Puyol': 'Carles Puyol',
  'Van der Vaart': 'Rafael van der Vaart',
  'Cicinho': 'Cicinho',
  'D. Tardelli': 'Diego Tardelli',
  'Scoponi': 'Norberto Scoponi',
  'Gamboa': 'Fernando Gamboa',
  'M. Pochettino': 'Mauricio Pochettino',
  'Bedrossian': 'Pascal Bedrossian',
  'J. Bats': 'Joel Bats',
  'P. Petrone': 'Pedro Petrone',
  'Z. Saldombide': 'Zoilo Saldombide',
  'Dürnberger': 'Bernd Durnberger',
  'J. Collins': 'John Collins',
  'Beckenbauer': 'Franz Beckenbauer',
  'Rummenigge': 'Karl-Heinz Rummenigge',
  'Del Piero': 'Alessandro Del Piero',
  'Dida': 'Dida',
  'Jordi Alba': 'Jordi Alba',
  'W. Samuel': 'Walter Samuel',
  'J. Stam': 'Jaap Stam',
  'Stam': 'Jaap Stam',
  'F. De Boer': 'Frank de Boer',
  'R. De Boer': 'Ronald de Boer',
  'Zidane': 'Zinedine Zidane',
  'Ronaldo': 'Ronaldo Nazario',
  'Ronaldinho': 'Ronaldinho',
  'Maradona': 'Diego Maradona',
  'Pele': 'Pele',
  'Cruyff': 'Johan Cruyff',
  'Henry': 'Thierry Henry',
  'Bergkamp': 'Dennis Bergkamp',
  'Nedved': 'Pavel Nedved',
  'Shevchenko': 'Andriy Shevchenko',
  'Batistuta': 'Gabriel Batistuta',
  'Figo': 'Luis Figo',
  'Rivaldo': 'Rivaldo',
  'Kaka': 'Kaka',
  'Iniesta': 'Andres Iniesta',
  'Xavi': 'Xavi Hernandez',
  'Casillas': 'Iker Casillas',
  'Buffon': 'Gianluigi Buffon',
  'Maldini': 'Paolo Maldini',
  'Nesta': 'Alessandro Nesta',
  'Cannavaro': 'Fabio Cannavaro',
  'Roberto Carlos': 'Roberto Carlos',
  'Cafu': 'Cafu',
  'Zanetti': 'Javier Zanetti',
  'Scholes': 'Paul Scholes',
  'Giggs': 'Ryan Giggs',
  'Beckham': 'David Beckham',
  'Gerrard': 'Steven Gerrard',
  'Lampard': 'Frank Lampard',
  'Vieira': 'Patrick Vieira',
  'Keane': 'Roy Keane',
  'Rooney': 'Wayne Rooney',
  'Eto\'o': 'Samuel Etoo',
  'Drogba': 'Didier Drogba',
  'Ibrahimovic': 'Zlatan Ibrahimovic',
  'Robben': 'Arjen Robben',
  'Ribery': 'Franck Ribery',
  'Lahm': 'Philipp Lahm',
  'Schweinsteiger': 'Bastian Schweinsteiger',
  'Neuer': 'Manuel Neuer',
  'Klose': 'Miroslav Klose',
  'Romario': 'Romario',
  'Dibu Martinez': 'Emiliano Martinez',
  'Taffarel': 'Claudio Taffarel',
  'Aldair': 'Aldair',
  'Branco': 'Branco',
  'Rai': 'Rai',
  'Zinho': 'Zinho',
  'Baros': 'Milan Baros',
  'C. Caniggia': 'Claudio Caniggia',
  'Caniggia': 'Claudio Caniggia',
  'Macnelly T.': 'Macnelly Torres'
};

// 4. Comprobador de coincidencia de nombres
function matchesPlayerName(matchedName, playerName) {
  if (!matchedName || !playerName) return false;
  const m = matchedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const p = playerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const pWords = p.split(/[\s.]+/).filter(w => w.length > 2);
  if (pWords.length === 0) return true;
  return pWords.some(w => m.includes(w));
}

// 5. Fetch seguro con reintento automático ante HTTP 429
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        const waitMs = (attempt + 1) * 4000;
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries - 1) return null;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return null;
}

// 6. Búsqueda en TheSportsDB
let sportsDbPausedUntil = 0;
async function searchTheSportsDB(query, originalName) {
  if (Date.now() < sportsDbPausedUntil) return null;
  try {
    const url = 'https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=' + encodeURIComponent(query);
    const res = await fetchWithRetry(url, { headers: { 'User-Agent': BROWSER_UA } });
    if (!res || !res.ok) {
      if (res?.status === 429) sportsDbPausedUntil = Date.now() + 30000;
      return null;
    }
    const data = await res.json().catch(() => null);
    if (!data?.player || data.player.length === 0) return null;

    for (const p of data.player) {
      if (!matchesPlayerName(p.strPlayer, originalName || query)) continue;
      if (p.strCutout && p.strCutout.trim().length > 0) {
        return { url: p.strCutout, source: 'TheSportsDB (Cutout)', matched: p.strPlayer };
      }
    }
    for (const p of data.player) {
      if (!matchesPlayerName(p.strPlayer, originalName || query)) continue;
      if (p.strThumb && p.strThumb.trim().length > 0) {
        return { url: p.strThumb, source: 'TheSportsDB (Thumb)', matched: p.strPlayer };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

// 7. Búsqueda en Wikidata (Knowledge Graph)
async function searchWikidata(query, originalName) {
  try {
    const url = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + encodeURIComponent(query) + '&language=es&format=json';
    const res = await fetchWithRetry(url, { headers: { 'User-Agent': WIKI_UA } });
    if (!res || !res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.search || data.search.length === 0) return null;

    for (const item of data.search.slice(0, 3)) {
      const desc = (item.description || '').toLowerCase();
      const isPlayer = /football|futbol|soccer|player|jugador|deportista|striker|midfielder|defender|goalkeeper|athlete/i.test(desc);
      if (!isPlayer) continue;

      if (!matchesPlayerName(item.label, originalName || query)) continue;

      const entityUrl = 'https://www.wikidata.org/wiki/Special:EntityData/' + item.id + '.json';
      const entRes = await fetchWithRetry(entityUrl, { headers: { 'User-Agent': WIKI_UA } });
      if (!entRes || !entRes.ok) continue;
      const entData = await entRes.json().catch(() => null);
      const claims = entData?.entities?.[item.id]?.claims;
      const p18 = claims?.P18;
      if (p18 && p18[0]?.mainsnak?.datavalue?.value) {
        const fileName = p18[0].mainsnak.datavalue.value;
        const imgUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(fileName) + '?width=400';
        return { url: imgUrl, source: 'Wikidata', matched: item.label };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

// 8. Búsqueda en Wikipedia (inglés y español)
async function searchWikipedia(query, originalName) {
  const variations = [
    { lang: 'es', term: query + ' futbolista' },
    { lang: 'en', term: query + ' footballer' },
    { lang: 'es', term: query },
    { lang: 'en', term: query }
  ];

  for (const v of variations) {
    try {
      const url = `https://${v.lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(v.term)}&gsrlimit=1&prop=description|pageimages&piprop=thumbnail&pithumbsize=400&format=json`;
      const res = await fetchWithRetry(url, { headers: { 'User-Agent': WIKI_UA } });
      if (!res || !res.ok) continue;

      const data = await res.json().catch(() => null);
      if (!data?.query?.pages) continue;

      const page = Object.values(data.query.pages)[0];
      if (!page?.thumbnail?.source) continue;

      // Verificar que el título coincida con el jugador
      if (!matchesPlayerName(page.title, originalName || query)) continue;

      // Descartar lugares geográficos o cosas no relacionadas
      const desc = (page.description || '').toLowerCase();
      if (/localidad|municipio|ciudad|provincia|película|canción|álbum|estación|santuario/i.test(desc)) continue;

      return { url: page.thumbnail.source, source: `Wikipedia (${v.lang.toUpperCase()})`, matched: page.title };
    } catch (err) {
      continue;
    }
  }

  return null;
}

// 9. Estrategia combinada por jugador
async function findPhotoForPlayer(player) {
  const rawName = player.name.replace(/\s+/g, ' ').trim();
  const alias = KNOWN_ALIASES[rawName] || KNOWN_ALIASES[player.name];

  const queries = [];
  if (alias) queries.push(alias);
  queries.push(rawName);

  let keyPart = rawName;
  const initialMatch = rawName.match(/^[A-Z]\.\s*(.+)$/);
  if (initialMatch) {
    keyPart = initialMatch[1].trim();
    if (!queries.includes(keyPart)) queries.push(keyPart);
  }

  if (player.short_name) {
    const cleanShort = player.short_name.replace(/\s+/g, ' ').trim();
    if (cleanShort.length > 2 && !queries.includes(cleanShort)) {
      queries.push(cleanShort);
    }
  }

  // 1. Probar TheSportsDB
  for (const q of queries) {
    const sportsMatch = await searchTheSportsDB(q, keyPart);
    if (sportsMatch) return sportsMatch;
  }

  // 2. Probar Wikidata (Knowledge Graph)
  for (const q of queries) {
    const wdMatch = await searchWikidata(q, keyPart);
    if (wdMatch) return wdMatch;
  }

  // 3. Probar Wikipedia EN y ES con validación
  for (const q of queries) {
    const wikiMatch = await searchWikipedia(q, keyPart);
    if (wikiMatch) return wikiMatch;
  }

  return null;
}

async function main() {
  console.log('====================================================');
  console.log('⚽ Cani League Manager: Buscador de Fotos de Jugadores');
  console.log('====================================================');
  console.log('Modo:', isAll ? 'Toda la base de datos (Liga + Agentes Libres)' : 'Solo equipos activos de liga');
  console.log('Sobrescribir fotos existentes:', isForce ? 'SÍ' : 'NO (Solo pendientes)');
  if (limit) console.log('Límite:', limit, 'jugadores');
  console.log('----------------------------------------------------');

  let allPlayers = [];
  let offset = 0;
  const pageSize = 1000;

  console.log('Cargando jugadores desde Supabase...');
  while (true) {
    let q = supabase
      .from('players')
      .select('id, name, short_name, position, nationality, photo_url, team_id, teams!inner(name)')
      .range(offset, offset + pageSize - 1);

    if (!isAll) {
      q = q.neq('teams.name', 'Agentes Libres');
    }

    if (!isForce) {
      q = q.is('photo_url', null);
    }

    const { data, error } = await q;
    if (error) {
      console.error('Error al consultar Supabase:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allPlayers.push(...data);
    offset += pageSize;

    if (limit && allPlayers.length >= limit) {
      allPlayers = allPlayers.slice(0, limit);
      break;
    }
  }

  const total = allPlayers.length;
  console.log(`Listo. ${total} jugadores pendientes por procesar.\n`);

  if (total === 0) {
    console.log('¡Todos los jugadores seleccionados ya tienen fotos asignadas!');
    return;
  }

  let found = 0;
  let missed = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i++) {
    const p = allPlayers[i];
    const teamName = p.teams?.name || 'Equipo';
    const progress = `[${i + 1}/${total}]`;

    process.stdout.write(`${progress} ${p.name} (${teamName})... `);

    const result = await findPhotoForPlayer(p);

    if (result) {
      await supabase.from('players').update({ photo_url: result.url }).eq('id', p.id);
      found++;
      console.log(`✓ ${result.matched} [${result.source}]`);
    } else {
      missed++;
      console.log(`— (Sin foto)`);
    }

    // Ritmo respetuoso y seguro de 250ms
    await new Promise(r => setTimeout(r, 250));
  }

  const durationMin = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log('\n====================================================');
  console.log(`Completado en ${durationMin} minutos:`);
  console.log(`  Fotos asignadas: ${found} (${((found / total) * 100).toFixed(1)}%)`);
  console.log(`  Sin foto (usan avatar estilizado): ${missed}`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
