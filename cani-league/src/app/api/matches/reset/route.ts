import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "@/lib/data/cache";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { leagueId } = await request.json();

    if (!leagueId) {
      return NextResponse.json(
        { error: "Falta el ID de la liga (leagueId)" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // 1. Borrar todos los partidos de la liga
    await supabase.from("matches").delete().eq("league_id", leagueId);

    // 2. Restablecer presupuestos a €50.000.000 (excluyendo Agentes Libres)
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .eq("league_id", leagueId);

    if (teams) {
      for (const t of teams) {
        if (
          !t.name.toLowerCase().includes("libre") &&
          !t.name.toLowerCase().includes("sin equipo")
        ) {
          await supabase
            .from("teams")
            .update({ budget: 50_000_000 })
            .eq("id", t.id);
        }
      }
    }

    // 3. Invalidar cachés
    invalidateMemCache("matches");
    invalidateMemCache("teams");
    try {
      revalidateTag("matches", "max");
      revalidateTag("standings", "max");
      revalidateTag("teams", "max");
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
