/**
 * La Necroporra: cada miembro ordena cómo cree que acabará la liga.
 * Puntúan los demás clubes (el propio no): 3 por puesto exacto, 1 si falla por uno.
 */

export const EXACT_POINTS = 3;
export const NEAR_POINTS = 1;

export type NecroPick = { teamId: string; guess: number; actual: number | null; points: number };

/** Lo que ha sacado una porra con la clasificación dada (team_id → puesto). */
export function scorePorra(ranking: string[], ownTeamId: string | null, actual: Map<string, number>) {
  const picks: NecroPick[] = ranking.map((teamId, i) => {
    const guess = i + 1;
    const pos = actual.get(teamId) ?? null;
    const counts = teamId !== ownTeamId && pos != null;
    const diff = pos == null ? null : Math.abs(pos - guess);
    const points = !counts || diff == null ? 0 : diff === 0 ? EXACT_POINTS : diff === 1 ? NEAR_POINTS : 0;
    return { teamId, guess, actual: pos, points };
  });
  return {
    picks,
    points: picks.reduce((s, p) => s + p.points, 0),
    exact: picks.filter((p) => p.points === EXACT_POINTS).length,
  };
}
