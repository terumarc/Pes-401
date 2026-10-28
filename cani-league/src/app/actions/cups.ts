"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyTrophyChange } from "@/lib/data/trophy-change";
import { requireAdmin, requireOneOf } from "@/lib/auth";
import {
  CUP_TROPHIES,
  firstRoundPairs,
  nextSlot,
  planCupMatch,
  roundsFor,
  shuffle,
  tieState,
  type CupTie,
  type CupTrophy,
} from "@/lib/cups";

const isSystemTeam = (name: string) => /libre|sin equipo/i.test(name);

function revalidateCups() {
  try {
    revalidatePath("/cups", "page");
    revalidatePath("/trophies", "page");
    revalidatePath("/finances", "page");
  } catch {}
}

/**
 * Sortea las tres copas de la temporada en curso con todos los clubes.
 * Borra los cuadros que hubiera de esta temporada.
 */
export async function drawCupsAction(leagueId: string, only?: CupTrophy): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: league } = await supabase.from("leagues").select("season").eq("id", leagueId).single();
  if (!league) throw new Error("Liga no encontrada.");
  const { data: teams } = await supabase.from("teams").select("id, name").eq("league_id", leagueId);
  const clubs = (teams ?? []).filter((t) => !isSystemTeam(t.name)).map((t) => t.id);
  if (clubs.length < 2) throw new Error("Hacen falta al menos 2 clubes para sortear.");

  const rounds = roundsFor(clubs.length);
  for (const trophy of only ? [only] : CUP_TROPHIES) {
    const { error: delErr } = await supabase
      .from("cup_ties")
      .delete()
      .eq("league_id", leagueId)
      .eq("season", league.season)
      .eq("trophy", trophy);
    if (delErr) throw new Error(`No se pudo borrar el cuadro anterior: ${delErr.message}`);

    const rows = [];
    // Primera ronda con el sorteo; el resto de rondas se crean vacías.
    const pairs = firstRoundPairs(shuffle(clubs));
    pairs.forEach(([home, away], slot) =>
      rows.push({ league_id: leagueId, season: league.season, trophy, round: 1, slot, is_final: rounds === 1, home_team_id: home, away_team_id: away }),
    );
    for (let r = 2; r <= rounds; r++) {
      const ties = 2 ** (rounds - r);
      for (let slot = 0; slot < ties; slot++) {
        rows.push({ league_id: leagueId, season: league.season, trophy, round: r, slot, is_final: r === rounds, home_team_id: null, away_team_id: null });
      }
    }
    const { data: created, error } = await supabase.from("cup_ties").insert(rows).select("*");
    if (error) throw new Error(`No se pudo guardar el sorteo: ${error.message}`);

    // Los que pasan directo (bye) avanzan ya.
    for (const t of (created ?? []) as CupTie[]) {
      if (t.round === 1 && t.home_team_id && !t.away_team_id) await resolveTie(t.id);
    }
  }
  revalidateCups();
}

/** Recalcula quién pasa en un cruce y lo coloca en la siguiente ronda; si es la final, entrega el título. */
async function resolveTie(tieId: string): Promise<void> {
  const supabase = await createClient();
  const { data: tie } = await supabase.from("cup_ties").select("*").eq("id", tieId).single();
  if (!tie) return;
  const t = tie as CupTie & { league_id: string; season: string };
  const { winner } = tieState(t);
  const previousWinner = t.winner_team_id;
  if (winner === previousWinner) return;

  await supabase.from("cup_ties").update({ winner_team_id: winner }).eq("id", t.id);

  if (t.is_final) {
    // Campeón: suma el título (y su premio). Si se corrige el resultado, se le quita al anterior.
    if (previousWinner) await applyTrophyChange(previousWinner, t.trophy, -1);
    if (winner) await applyTrophyChange(winner, t.trophy, 1);
    return;
  }

  const next = nextSlot(t.slot);
  await supabase
    .from("cup_ties")
    .update(next.side === "home" ? { home_team_id: winner } : { away_team_id: winner })
    .eq("league_id", t.league_id)
    .eq("season", t.season)
    .eq("trophy", t.trophy)
    .eq("round", t.round + 1)
    .eq("slot", next.slot);
}

/** Apunta el resultado de un partido de copa (ida = 1, vuelta = 2) y, si hace falta, quién ganó en los penaltis. */
export async function recordCupLegAction(
  tieId: string,
  leg: 1 | 2,
  homeGoals: number | null,
  awayGoals: number | null,
  penaltyWinnerId: string | null,
): Promise<void> {
  const clean = (n: number | null) => (n == null ? null : Math.max(0, Math.min(30, Math.trunc(n))));
  const supabase = await createClient();
  const { data: current } = await supabase.from("cup_ties").select("home_team_id, away_team_id").eq("id", tieId).single();
  if (!current) throw new Error("Cruce no encontrado.");
  await requireOneOf([current.home_team_id, current.away_team_id]);
  const patch =
    leg === 1
      ? { leg1_home_goals: clean(homeGoals), leg1_away_goals: clean(awayGoals), penalty_winner_id: penaltyWinnerId }
      : { leg2_home_goals: clean(homeGoals), leg2_away_goals: clean(awayGoals), penalty_winner_id: penaltyWinnerId };
  const { error } = await supabase.from("cup_ties").update(patch).eq("id", tieId);
  if (error) throw new Error(`No se pudo guardar el resultado: ${error.message}`);
  await resolveTie(tieId);
  revalidateCups();
}

/**
 * Prepara el cruce para un partido de copa elegido a mano (local y visitante).
 * Si los dos equipos no estaban emparejados, reordena la ronda. Devuelve el cruce listo para apuntar el resultado.
 */
export async function arrangeCupTieAction(
  leagueId: string,
  trophy: CupTrophy,
  homeId: string,
  awayId: string,
): Promise<{ tie: CupTie; leg: 1 | 2 }> {
  await requireOneOf([homeId, awayId]);
  const supabase = await createClient();
  const { data: league } = await supabase.from("leagues").select("season").eq("id", leagueId).single();
  if (!league) throw new Error("Liga no encontrada.");
  const { data: rows, error } = await supabase
    .from("cup_ties")
    .select("*")
    .eq("league_id", leagueId)
    .eq("season", league.season)
    .eq("trophy", trophy);
  if (error) throw new Error(`No se pudo leer el cuadro: ${error.message}`);
  const { data: teams } = await supabase.from("teams").select("id, name").eq("league_id", leagueId);
  const name = (id: string) => teams?.find((t) => t.id === id)?.name ?? "Ese equipo";

  const plan = planCupMatch((rows ?? []) as CupTie[], homeId, awayId, name);
  if (!plan.ok) throw new Error(plan.error);

  if (plan.swap) {
    const { error: e1 } = await supabase
      .from("cup_ties")
      .update({ home_team_id: plan.swap.home, away_team_id: plan.swap.away })
      .eq("id", plan.swap.tie.id);
    if (e1) throw new Error(`No se pudo cambiar el cruce: ${e1.message}`);
  }
  let tie = plan.tie;
  if (plan.home !== tie.home_team_id || plan.away !== tie.away_team_id) {
    const { data: updated, error: e2 } = await supabase
      .from("cup_ties")
      .update({ home_team_id: plan.home, away_team_id: plan.away })
      .eq("id", tie.id)
      .select("*")
      .single();
    if (e2 || !updated) throw new Error(`No se pudo preparar el cruce: ${e2?.message ?? ""}`);
    tie = updated as CupTie;
  }
  revalidateCups();
  return { tie, leg: plan.leg };
}
