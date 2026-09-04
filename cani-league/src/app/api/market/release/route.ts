import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidatePlayersCache } from "@/lib/data/league";
import { invalidateMemCache } from "@/lib/data/cache";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId } = body as { playerId: string };

    if (!playerId) {
      return NextResponse.json(
        { error: "Falta el parámetro obligatorio playerId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Obtener jugador y su equipo actual
    const { data: player, error: playerErr } = await supabase
      .from("players")
      .select("*, team:teams(*)")
      .eq("id", playerId)
      .single();

    if (playerErr || !player) {
      return NextResponse.json(
        { error: "Jugador no encontrado" },
        { status: 404 }
      );
    }

    // 2. Verificar que pertenezca a un equipo de la liga (no agente libre)
    const isFreeAgent =
      !player.team_id ||
      !player.team ||
      player.team.name.toLowerCase().includes("libre") ||
      player.team.name.toLowerCase().includes("sin equipo");

    if (isFreeAgent) {
      return NextResponse.json(
        { error: "El jugador ya es agente libre / está en el mercado" },
        { status: 400 }
      );
    }

    // 3. Buscar el equipo de Agentes Libres
    const { data: freeAgentTeam, error: freeAgentTeamErr } = await supabase
      .from("teams")
      .select("id, name, league_id")
      .or("name.ilike.%libre%,name.ilike.%sin equipo%")
      .limit(1)
      .maybeSingle();

    if (freeAgentTeamErr || !freeAgentTeam) {
      return NextResponse.json(
        { error: "No se encontró el equipo de Agentes Libres en el sistema" },
        { status: 500 }
      );
    }

    // 4. Calcular el 30% del precio (transfer_price o market_value)
    const originalPrice = Number(player.transfer_price || player.market_value || 0);
    const releaseFee = Math.round(originalPrice * 0.3);

    const sellerTeam = player.team;
    const currentBudget = Number(sellerTeam.budget || 0);
    const newBudget = currentBudget + releaseFee;

    // 5. Abonar el 30% al equipo vendedor
    const { error: teamUpdateErr } = await supabase
      .from("teams")
      .update({ budget: newBudget })
      .eq("id", sellerTeam.id);

    if (teamUpdateErr) {
      return NextResponse.json(
        { error: "Error al actualizar el presupuesto del club: " + teamUpdateErr.message },
        { status: 500 }
      );
    }

    // 6. Mover el jugador a Agentes Libres y habilitarlo en el mercado
    const { data: updatedPlayer, error: updatePlayerErr } = await supabase
      .from("players")
      .update({
        team_id: freeAgentTeam.id,
        available_in_market: true,
      })
      .eq("id", playerId)
      .select("*")
      .single();

    if (updatePlayerErr || !updatedPlayer) {
      return NextResponse.json(
        { error: "Error al liberar el jugador: " + (updatePlayerErr?.message || "") },
        { status: 500 }
      );
    }

    // 7. Registrar en el historial de transferencias
    try {
      await supabase.from("transfers").insert({
        league_id: sellerTeam.league_id || freeAgentTeam.league_id,
        player_id: playerId,
        player_name: player.name,
        from_team_id: sellerTeam.id,
        from_team_name: sellerTeam.name,
        to_team_id: freeAgentTeam.id,
        to_team_name: "Agentes Libres (Liberado)",
        fee: releaseFee,
      });
    } catch {
      // Si la tabla de transferencias falla, no bloqueamos la operación principal
    }

    // 8. Invalidar cachés
    invalidatePlayersCache();
    invalidateMemCache("teams");
    invalidateMemCache("team");
    invalidateMemCache("player");
    try {
      revalidateTag("players", "max");
      revalidateTag("teams", "max");
    } catch {}

    return NextResponse.json({
      success: true,
      player: updatedPlayer,
      sellerTeamId: sellerTeam.id,
      sellerTeamName: sellerTeam.name,
      previousBudget: currentBudget,
      newBudget,
      originalPrice,
      releaseFee,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
