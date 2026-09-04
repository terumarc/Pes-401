import { createClient, createStaticClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "./cache";
import { revalidateTag } from "next/cache";
import type { Team } from "@/types";

export const DEFAULT_BUDGET = 50_000_000;

export const MULTIPLIER_TOP = 0.25;
export const MULTIPLIER_BOTTOM = 0.55;

/**
 * Calcula el multiplicador según la posición en la tabla de la liga.
 * Posición 1 (campeón/líder) = 0.25
 * Última posición = 0.55
 */
export function calculatePositionMultiplier(
  position: number,
  totalTeams: number,
): number {
  if (totalTeams <= 1) return MULTIPLIER_TOP;
  const clampedPos = Math.max(1, Math.min(position, totalTeams));
  const ratio = (clampedPos - 1) / (totalTeams - 1);
  return MULTIPLIER_TOP + (MULTIPLIER_BOTTOM - MULTIPLIER_TOP) * ratio;
}

/**
 * Inicializa el presupuesto de todos los equipos de una liga al presupuesto base por defecto (€50M).
 */
export async function initTeamBudgets(leagueId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ budget: DEFAULT_BUDGET })
    .eq("league_id", leagueId);

  if (error) throw error;
  invalidateMemCache("teams");
  try {
    revalidateTag("teams", "max");
  } catch {}
}

/**
 * Aplica los multiplicadores de posición a los presupuestos de los equipos según la clasificación.
 * Se aplica a mitad de temporada (tras disputar todos los partidos de ida) y al final (todos los de vuelta).
 */
export async function applySeasonMultipliers(
  leagueId: string,
  standings: Array<{ team_id: string; position: number }>,
  stage: "mid" | "end",
): Promise<Array<{ teamId: string; oldBudget: number; newBudget: number; multiplier: number }>> {
  const supabase = await createClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, budget")
    .eq("league_id", leagueId);

  if (error || !teams) throw error ?? new Error("No se encontraron equipos para la liga");

  const totalTeams = teams.length;
  const results: Array<{ teamId: string; oldBudget: number; newBudget: number; multiplier: number }> = [];

  for (const team of teams) {
    const pos = standings.find((s) => s.team_id === team.id)?.position ?? totalTeams;
    const mult = calculatePositionMultiplier(pos, totalTeams);
    const newBudget = Math.round(team.budget * (1 + mult));

    await supabase
      .from("teams")
      .update({ budget: newBudget })
      .eq("id", team.id);

    results.push({
      teamId: team.id,
      oldBudget: team.budget,
      newBudget,
      multiplier: mult,
    });
  }

  invalidateMemCache("teams");
  try {
    revalidateTag("teams", "max");
  } catch {}

  return results;
}
