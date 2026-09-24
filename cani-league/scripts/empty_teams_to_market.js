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

async function main() {
  console.log('--- INICIANDO PROCESO: VACIADO DE EQUIPOS Y TRASPASO AL MERCADO LIBRE ---');

  // 1. Localizar el equipo de Agentes Libres
  const { data: freeAgentTeam, error: freeTeamErr } = await supabase
    .from('teams')
    .select('id, name')
    .or('name.ilike.%libre%,name.ilike.%sin equipo%')
    .limit(1)
    .maybeSingle();

  if (freeTeamErr || !freeAgentTeam) {
    console.error('Error: no se encontró el equipo de Agentes Libres en Supabase:', freeTeamErr);
    process.exit(1);
  }

  console.log(`Equipo de destino: "${freeAgentTeam.name}" (ID: ${freeAgentTeam.id})`);

  // 2. Obtener todos los equipos de la liga excepto Agentes Libres
  const { data: clubs, error: clubsErr } = await supabase
    .from('teams')
    .select('id, name')
    .neq('id', freeAgentTeam.id);

  if (clubsErr) {
    console.error('Error al obtener clubes:', clubsErr);
    process.exit(1);
  }

  console.log(`Clubes encontrados: ${clubs.length}`);
  const clubIds = clubs.map((c) => c.id);

  // 3. Contar jugadores actualmente en clubes
  const { count: clubPlayersCount, error: countErr } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .in('team_id', clubIds);

  if (countErr) {
    console.error('Error al contar jugadores de clubes:', countErr);
    process.exit(1);
  }

  console.log(`Jugadores actualmente en plantillas de clubes a liberar: ${clubPlayersCount}`);

  // 4. Mover todos los jugadores de los clubes a Agentes Libres con available_in_market = true
  if (clubPlayersCount > 0) {
    const { data: updatedClubPlayers, error: updateErr } = await supabase
      .from('players')
      .update({
        team_id: freeAgentTeam.id,
        available_in_market: true,
      })
      .in('team_id', clubIds)
      .select('id, name');

    if (updateErr) {
      console.error('Error al mover jugadores de clubes a Agentes Libres:', updateErr);
      process.exit(1);
    }

    console.log(`Éxito: Se han liberado ${updatedClubPlayers?.length || clubPlayersCount} jugadores a Agentes Libres.`);
  } else {
    console.log('Los clubes ya no tenían jugadores asignados.');
  }

  // 5. Asegurar que TODOS los jugadores del sistema tengan available_in_market = true
  const { count: unavailCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('available_in_market', false);

  if (unavailCount && unavailCount > 0) {
    console.log(`Habilitando ${unavailCount} jugadores restantes en el mercado libre...`);
    const { error: availErr } = await supabase
      .from('players')
      .update({ available_in_market: true })
      .eq('available_in_market', false);

    if (availErr) {
      console.error('Error al habilitar jugadores restantes en el mercado:', availErr);
    } else {
      console.log('Todos los jugadores están ahora disponibles en el mercado.');
    }
  }

  // 6. VERIFICACIÓN FINAL
  console.log('\n=== VERIFICACIÓN FINAL DEL ESTADO ===');
  for (const c of clubs) {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', c.id);
    console.log(`Club "${c.name}": ${count} jugadores en plantilla.`);
  }

  const { count: freeCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', freeAgentTeam.id);
  console.log(`Equipo "${freeAgentTeam.name}": ${freeCount} jugadores.`);

  const { count: totalMarket } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('available_in_market', true);
  console.log(`Total disponibles en Mercado Libre: ${totalMarket}`);

  console.log('--- OPERACIÓN COMPLETADA CON ÉXITO ---');
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
