import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidatePlayersCache } from "@/lib/data/league";
import { invalidateMemCache } from "@/lib/data/cache";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, buyerTeamId, type } = body as {
      playerId: string;
      buyerTeamId: string;
      type: "clausula" | "mercado";
    };

    if (!playerId || !buyerTeamId || !type) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios (playerId, buyerTeamId, type)" },
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

    if (player.team_id === buyerTeamId) {
      return NextResponse.json(
        { error: "El jugador ya pertenece a este equipo" },
        { status: 400 }
      );
    }

    // Identificar si el equipo actual es de agentes libres / sin equipo
    const isFreeAgent =
      !player.team_id ||
      !player.team ||
      player.team.name.toLowerCase().includes("libre") ||
      player.team.name.toLowerCase().includes("sin equipo");

    if (type === "clausula" && isFreeAgent) {
      return NextResponse.json(
        { error: "Un agente libre se ficha a través del mercado ordinario, no por cláusula" },
        { status: 400 }
      );
    }

    // 2. Determinar precio según tipo de compra
    // Si es cláusula y existe clause_fee, usar clause_fee; de lo contrario transfer_price
    const price =
      type === "clausula" && (player as any).clause_fee != null
        ? Number((player as any).clause_fee)
        : Number(player.transfer_price || player.market_value || 0);

    // 3. Verificar presupuesto del comprador
    const { data: buyer, error: buyerErr } = await supabase
      .from("teams")
      .select("id, name, budget, league_id")
      .eq("id", buyerTeamId)
      .single();

    if (buyerErr || !buyer) {
      return NextResponse.json(
        { error: "Equipo comprador no encontrado" },
        { status: 404 }
      );
    }

    if (buyer.budget < price) {
      return NextResponse.json(
        {
          error: `Presupuesto insuficiente. Necesitas €${price.toLocaleString("es-ES")} pero tienes €${buyer.budget.toLocaleString("es-ES")}.`,
        },
        { status: 400 }
      );
    }

    // 4. Actualizar presupuesto del comprador
    const newBuyerBudget = buyer.budget - price;
    const { error: buyerUpdateErr } = await supabase
      .from("teams")
      .update({ budget: newBuyerBudget })
      .eq("id", buyerTeamId);

    if (buyerUpdateErr) {
      return NextResponse.json(
        { error: "Error al descontar presupuesto del comprador: " + buyerUpdateErr.message },
        { status: 500 }
      );
    }

    // 5. Si el vendedor es un equipo real de la liga (y no agentes libres), abonar el precio de la cláusula
    let sellerBudgetAfter: number | null = null;
    if (!isFreeAgent && player.team_id) {
      const { data: seller } = await supabase
        .from("teams")
        .select("id, budget")
        .eq("id", player.team_id)
        .single();

      if (seller) {
        sellerBudgetAfter = seller.budget + price;
        await supabase
          .from("teams")
          .update({ budget: sellerBudgetAfter })
          .eq("id", player.team_id);
      }
    }

    // 6. Mover el jugador al equipo comprador
    const { data: updatedPlayer, error: updatePlayerErr } = await supabase
      .from("players")
      .update({
        team_id: buyerTeamId,
        available_in_market: false,
      })
      .eq("id", playerId)
      .select("*")
      .single();

    if (updatePlayerErr || !updatedPlayer) {
      return NextResponse.json(
        { error: "Error al transferir el jugador: " + (updatePlayerErr?.message || "") },
        { status: 500 }
      );
    }

    // 7. Registrar en el historial de transferencias
    try {
      await supabase.from("transfers").insert({
        league_id: buyer.league_id,
        player_id: playerId,
        player_name: player.name,
        from_team_id: player.team_id,
        from_team_name: isFreeAgent ? "Agentes Libres" : (player.team?.name || "Sin Equipo"),
        to_team_id: buyerTeamId,
        to_team_name: buyer.name,
        fee: price,
      });
    } catch {
      // Si la tabla de transferencias falla o no existe, no rompemos la operación principal
    }

    // 8. Invalidar cachés
    invalidatePlayersCache();
    invalidateMemCache("teams");
    invalidateMemCache("player");
    try {
      revalidateTag("players", "max");
      revalidateTag("teams", "max");
    } catch {}

    return NextResponse.json({
      success: true,
      player: updatedPlayer,
      buyerBudget: newBuyerBudget,
      sellerBudget: sellerBudgetAfter,
      price,
      type,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
