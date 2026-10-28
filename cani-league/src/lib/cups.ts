export const CUP_TROPHIES = ["champions", "cup", "conference"] as const;
export type CupTrophy = (typeof CUP_TROPHIES)[number];

export const CUP_LABELS: Record<CupTrophy, string> = {
  champions: "Champions League",
  cup: "Copa de Liga",
  conference: "Conference League",
};

export type CupTie = {
  id: string;
  trophy: string;
  round: number;
  slot: number;
  is_final: boolean;
  home_team_id: string | null;
  away_team_id: string | null;
  leg1_home_goals: number | null;
  leg1_away_goals: number | null;
  /** Goles del equipo «home» de la eliminatoria en la vuelta (aunque juegue fuera). */
  leg2_home_goals: number | null;
  leg2_away_goals: number | null;
  penalty_winner_id: string | null;
  winner_team_id: string | null;
};

/** Número de rondas para n equipos (cuadro de potencia de 2). */
export function roundsFor(n: number) {
  return Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));
}

/** Nombre de la ronda contando desde la final. */
export function roundName(round: number, totalRounds: number) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinales";
  if (fromEnd === 2) return "Cuartos de final";
  if (fromEnd === 3) return "Octavos de final";
  return `Ronda ${round}`;
}

/**
 * Cruces de la primera ronda tras el sorteo. Los huecos sobrantes son «byes»:
 * el equipo pasa directo. Los byes se reparten en cruces distintos.
 */
export function firstRoundPairs(shuffled: string[]): [string | null, string | null][] {
  const rounds = roundsFor(shuffled.length);
  const size = 2 ** rounds;
  const ties = size / 2;
  const byes = size - shuffled.length;
  const pairs: [string | null, string | null][] = [];
  let i = 0;
  for (let t = 0; t < ties; t++) {
    if (t < byes) pairs.push([shuffled[i++], null]);
    else pairs.push([shuffled[i++], shuffled[i++]]);
  }
  return pairs;
}

export type TieState = {
  /** Partidos que se pueden apuntar (1 en la final, 2 en el resto). */
  legs: 1 | 2;
  aggHome: number | null;
  aggAway: number | null;
  /** El global está empatado y hace falta decidir por penaltis. */
  needsPenalties: boolean;
  winner: string | null;
};

/** Estado de una eliminatoria: global y quién pasa. */
export function tieState(t: CupTie): TieState {
  const legs: 1 | 2 = t.is_final ? 1 : 2;
  if (t.home_team_id && !t.away_team_id) return { legs, aggHome: null, aggAway: null, needsPenalties: false, winner: t.home_team_id };
  if (!t.home_team_id || !t.away_team_id) return { legs, aggHome: null, aggAway: null, needsPenalties: false, winner: null };

  const l1 = t.leg1_home_goals != null && t.leg1_away_goals != null;
  const l2 = t.leg2_home_goals != null && t.leg2_away_goals != null;
  const done = legs === 1 ? l1 : l1 && l2;
  const aggHome = l1 ? (t.leg1_home_goals ?? 0) + (legs === 2 && l2 ? t.leg2_home_goals ?? 0 : 0) : null;
  const aggAway = l1 ? (t.leg1_away_goals ?? 0) + (legs === 2 && l2 ? t.leg2_away_goals ?? 0 : 0) : null;
  if (!done || aggHome == null || aggAway == null) return { legs, aggHome, aggAway, needsPenalties: false, winner: null };
  if (aggHome > aggAway) return { legs, aggHome, aggAway, needsPenalties: false, winner: t.home_team_id };
  if (aggAway > aggHome) return { legs, aggHome, aggAway, needsPenalties: false, winner: t.away_team_id };
  const pen = t.penalty_winner_id;
  const valid = pen === t.home_team_id || pen === t.away_team_id;
  return { legs, aggHome, aggAway, needsPenalties: !valid, winner: valid ? pen : null };
}

/** Hueco de la siguiente ronda al que va el ganador de un cruce. */
export function nextSlot(slot: number): { slot: number; side: "home" | "away" } {
  return { slot: Math.floor(slot / 2), side: slot % 2 === 0 ? "home" : "away" };
}

/** Mezcla de Fisher-Yates. */
export function shuffle<T>(list: T[], rnd: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Plan para apuntar un partido de copa entre dos equipos elegidos a mano. */
export type CupMatchPlan =
  | { ok: false; error: string }
  | {
      ok: true;
      /** Cruce donde se apunta el partido. */
      tie: CupTie;
      /** Si hay que cambiar los cruces de la ronda: el otro cruce y cómo queda. */
      swap: { tie: CupTie; home: string; away: string } | null;
      /** Cómo queda el cruce donde se juega (local de la ida primero). */
      home: string;
      away: string;
      /** Partido que toca: 1 ida (o final), 2 vuelta. */
      leg: 1 | 2;
    };

const played1 = (t: CupTie) => t.leg1_home_goals != null && t.leg1_away_goals != null;
const played2 = (t: CupTie) => t.leg2_home_goals != null && t.leg2_away_goals != null;

/** Cruce sin decidir en el que está un equipo ahora mismo (null si ya está eliminado o es campeón). */
export function currentTieOf(ties: CupTie[], teamId: string): CupTie | null {
  return (
    ties
      .filter((t) => (t.home_team_id === teamId || t.away_team_id === teamId) && !tieState(t).winner)
      .sort((a, b) => a.round - b.round)[0] ?? null
  );
}

/**
 * Decide dónde va un partido de copa entre `homeId` (local) y `awayId`.
 * Si ya se enfrentan en el cuadro, se apunta ahí. Si no, y los dos están en la misma ronda
 * con sus cruces sin empezar, se reordena la ronda: ellos dos juntos y sus rivales del sorteo entre sí.
 */
export function planCupMatch(
  ties: CupTie[],
  homeId: string,
  awayId: string,
  name: (id: string) => string = (id) => id,
): CupMatchPlan {
  if (homeId === awayId) return { ok: false, error: "Elige dos equipos distintos." };
  const x = currentTieOf(ties, homeId);
  const y = currentTieOf(ties, awayId);
  if (!x) return { ok: false, error: `${name(homeId)} ya no sigue en esta copa.` };
  if (!y) return { ok: false, error: `${name(awayId)} ya no sigue en esta copa.` };

  // Ya se enfrentan: se apunta el siguiente partido de la eliminatoria.
  if (x.id === y.id) {
    const twoLegs = !x.is_final;
    if (!played1(x)) return { ok: true, tie: x, swap: null, home: homeId, away: awayId, leg: 1 };
    if (twoLegs && !played2(x)) return { ok: true, tie: x, swap: null, home: x.home_team_id!, away: x.away_team_id!, leg: 2 };
    // Global empatado sin penaltis: se vuelve a abrir el último partido para elegirlos.
    return { ok: true, tie: x, swap: null, home: x.home_team_id!, away: x.away_team_id!, leg: twoLegs ? 2 : 1 };
  }

  if (x.round !== y.round) {
    return { ok: false, error: `${name(homeId)} y ${name(awayId)} no están en la misma ronda.` };
  }
  for (const [t, id] of [[x, homeId], [y, awayId]] as const) {
    if (!t.home_team_id || !t.away_team_id) return { ok: false, error: `${name(id)} todavía espera rival de la ronda anterior.` };
    if (played1(t)) return { ok: false, error: `La eliminatoria de ${name(id)} ya ha empezado; no se puede cambiar su rival.` };
  }
  const rivalX = x.home_team_id === homeId ? x.away_team_id! : x.home_team_id!;
  const rivalY = y.home_team_id === awayId ? y.away_team_id! : y.home_team_id!;
  return { ok: true, tie: x, swap: { tie: y, home: rivalX, away: rivalY }, home: homeId, away: awayId, leg: 1 };
}
