import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { getLeagueSeason } from "@/lib/data/season";
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

    await requireAdmin();
    const supabase = await createClient();

    // 1. Borrar los partidos de la temporada en curso (las anteriores se conservan)
    const season = await getLeagueSeason(supabase, leagueId);
    const { error: matchesErr } = await supabase
      .from("matches")
      .delete()
      .eq("league_id", leagueId)
      .eq("season", season);

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
    invalidateMemCache();
    try {
      revalidateTag("matches", "max");
      revalidateTag("standings", "max");
      revalidateTag("teams", "max");
    } catch {}

    try {
      revalidatePath("/calendar");
      revalidatePath("/standings");
      revalidatePath("/league");
      revalidatePath("/teams");
      revalidatePath("/finances");
    } catch {}

    return NextResponse.json({ success: true, mode });
  } catch (err) {
    const denied = authErrorResponse(err);
    if (denied) return denied;
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

