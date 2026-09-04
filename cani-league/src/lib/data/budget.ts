import { createClient, createStaticClient } from "@/lib/supabase/server";
import { invalidateMemCache } from "./cache";
import { revalidateTag } from "next/cache";
import type { Team } from "@/types";

export const DEFAULT_BUDGET = 50_000_000;

export const BASE_POSITION_REWARD = 25_000_000;
export const POSITION_INCREMENT = 5_000_000;

export const MULTIPLIER_TOP = 0.25;
export const MULTIPLIER_BOTTOM = 0.55;

/**
 * Calcula la inyección de dinero según la posición en la tabla de la liga:
 * 1º posición (líder) = 25.000.000 €
 * Cada puesto posterior suma +5.000.000 € (2º = 30M, 3º = 35M, ..., último = 25M + (n-1)*5M)
 */
export function calculatePositionReward(position: number): number {
  const clampedPos = Math.max(1, position);
  return BASE_POSITION_REWARD + (clampedPos - 1) * POSITION_INCREMENT;
}

/**
 * @deprecated Función heredada de compatibilidad.
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
 * Aplica las inyecciones económicas de posición a los presupuestos de los equipos según la clasificación.
 * Se aplica a mitad de temporada (tras disputar todos los partidos de ida) y al final (todos los de vuelta).
 * El 1º clasificado recibe 25M y se incrementa en +5M por puesto hasta el último.
 */
export async function applySeasonMultipliers(
  leagueId: string,
  standings: Array<{ team_id: string; position: number }>,
  stage: "mid" | "end",
): Promise<Array<{ teamId: string; oldBudget: number; newBudget: number; reward: number; multiplier: number }>> {
  const supabase = await createClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, budget")
    .eq("league_id", leagueId);

  if (error || !teams) throw error ?? new Error("No se encontraron equipos para la liga");

  // Filtrar equipos reales (excluyendo Agentes Libres si estuvieran en la liga)
  const playingTeams = teams.filter(
    (t) => !t.name.toLowerCase().includes("libre") && !t.name.toLowerCase().includes("sin equipo")
  );

  const totalTeams = playingTeams.length;
  const results: Array<{ teamId: string; oldBudget: number; newBudget: number; reward: number; multiplier: number }> = [];

  for (const team of playingTeams) {
    const pos = standings.find((s) => s.team_id === team.id)?.position ?? totalTeams;
    const reward = calculatePositionReward(pos);
    const newBudget = team.budget + reward;

    await supabase
      .from("teams")
      .update({ budget: newBudget })
      .eq("id", team.id);

    results.push({
      teamId: team.id,
      oldBudget: team.budget,
      newBudget,
      reward,
      multiplier: team.budget > 0 ? reward / team.budget : 0,
    });
  }

  invalidateMemCache("teams");
  try {
    revalidateTag("teams", "max");
  } catch {}

  return results;
}
