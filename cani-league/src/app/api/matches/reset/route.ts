import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const { leagueId, mode = "league" } = await request.json();

    if (!leagueId) {
      return NextResponse.json(
        { error: "Falta el ID de la liga (leagueId)" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // 1. Borrar todos los partidos de la liga
    const { error: matchesErr } = await supabase
      .from("matches")
      .delete()
      .eq("league_id", leagueId);

    if (matchesErr) {
      return NextResponse.json(
        { error: `Error al borrar partidos: ${matchesErr.message}` },
        { status: 500 },
      );
    }

    // 2. Restablecer presupuestos a €50.000.000 (solo si mode === 'league')
    if (mode === "league") {
      const { data: teams, error: teamsErr } = await supabase
        .from("teams")
        .select("id, name")
        .eq("league_id", leagueId);

      if (teamsErr) {
        return NextResponse.json(
          { error: `Error al consultar equipos: ${teamsErr.message}` },
          { status: 500 },
        );
      }

      if (teams) {
        for (const t of teams) {
          if (
            !t.name.toLowerCase().includes("libre") &&
            !t.name.toLowerCase().includes("sin equipo")
          ) {
            const { error: updateErr } = await supabase
              .from("teams")
              .update({ budget: 50_000_000 })
              .eq("id", t.id);

            if (updateErr) {
              console.error(`Error al restablecer fondos de ${t.name}:`, updateErr);
            }
          }
        }
      }
    }

    // 3. Invalidar cachés
    invalidateMemCache("matches");
    invalidateMemCache("teams");
    invalidateMemCache("standing");
    try {
      revalidateTag("matches", { expire: 0 });
      revalidateTag("standings", { expire: 0 });
      revalidateTag("teams", { expire: 0 });
    } catch {}

    try {
      revalidatePath("/calendar");
      revalidatePath("/standings");
      revalidatePath("/league");
      revalidatePath("/teams");
    } catch {}

    return NextResponse.json({ success: true, mode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

