/** Partido mínimo para estadísticas (liga, cualquier temporada). */
export type MatchLite = {
  id: string;
  season?: string | null;
  home_team_id: string;
  away_team_id: string;
  home_goals: number | null;
  away_goals: number | null;
  played: boolean;
  played_at: string | null;
  matchday: number;
};

export type FormResult = "V" | "E" | "D";

function order(a: MatchLite, b: MatchLite) {
  const ta = a.played_at ?? "";
  const tb = b.played_at ?? "";
  return ta === tb ? a.matchday - b.matchday : ta < tb ? -1 : 1;
}

/** Últimos resultados de un equipo (del más antiguo al más reciente). */
export function teamForm(matches: MatchLite[], teamId: string, n = 5): FormResult[] {
  return matches
    .filter((m) => m.played && (m.home_team_id === teamId || m.away_team_id === teamId))
    .sort(order)
    .slice(-n)
    .map((m) => {
      const mine = m.home_team_id === teamId ? m.home_goals ?? 0 : m.away_goals ?? 0;
      const theirs = m.home_team_id === teamId ? m.away_goals ?? 0 : m.home_goals ?? 0;
      return mine > theirs ? "V" : mine < theirs ? "D" : "E";
    });
}

export type HeadToHead = {
  games: MatchLite[];
  winsA: number;
  winsB: number;
  draws: number;
  goalsA: number;
  goalsB: number;
  /** Mayor diferencia de goles a favor de cualquiera de los dos. */
  biggest: MatchLite | null;
};

/** Historial de enfrentamientos entre dos clubes (todas las temporadas). */
export function headToHead(matches: MatchLite[], a: string, b: string): HeadToHead {
  const games = matches
    .filter(
      (m) =>
        m.played &&
        ((m.home_team_id === a && m.away_team_id === b) || (m.home_team_id === b && m.away_team_id === a)),
    )
    .sort(order)
    .reverse();
  const h: HeadToHead = { games, winsA: 0, winsB: 0, draws: 0, goalsA: 0, goalsB: 0, biggest: null };
  let best = 0;
  let bestTotal = 0;
  for (const m of games) {
    const ga = m.home_team_id === a ? m.home_goals ?? 0 : m.away_goals ?? 0;
    const gb = m.home_team_id === a ? m.away_goals ?? 0 : m.home_goals ?? 0;
    h.goalsA += ga;
    h.goalsB += gb;
    if (ga > gb) h.winsA++;
    else if (gb > ga) h.winsB++;
    else h.draws++;
    const diff = Math.abs(ga - gb);
    if (diff > best || (diff === best && diff > 0 && ga + gb > bestTotal)) {
      best = diff;
      bestTotal = ga + gb;
      h.biggest = m;
    }
  }
  return h;
}

export type GoalRow = { team_id: string; player_id: string | null; player_name: string; goals: number; match_id?: string | null; season?: string };

export type Scorer = { playerId: string | null; name: string; teamId: string; goals: number };

/** Tabla de goleadores a partir de los goles guardados. */
export function topScorers(goals: GoalRow[]): Scorer[] {
  const map = new Map<string, Scorer>();
  for (const g of goals) {
    const key = g.player_id ?? `${g.team_id}:${g.player_name}`;
    const row = map.get(key) ?? { playerId: g.player_id, name: g.player_name, teamId: g.team_id, goals: 0 };
    row.goals += g.goals;
    map.set(key, row);
  }
  return [...map.values()].sort((x, y) => y.goals - x.goals || x.name.localeCompare(y.name, "es"));
}
