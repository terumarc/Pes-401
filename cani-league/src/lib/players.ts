export type PlayerTier = "S+" | "S" | "A" | "B" | "C" | "D" | "POR";

export interface TierInfo {
  tier: PlayerTier;
  label: string;
  color: string;
  bgColor: string;
}

export interface TierThresholds {
  sPlus: number;
  s: number;
  a: number;
  b: number;
  c: number;
}

export type PositionGroup = "all" | "def" | "mid" | "att" | "gk";

export function getPositionGroup(position?: string | null): PositionGroup {
  if (!position) return "mid";
  const pos = position.toUpperCase();
  if (pos === "GK") return "gk";
  if (["CB", "LB", "RB", "SW"].includes(pos)) return "def";
  if (["DMF", "CMF", "AMF", "LMF", "RMF"].includes(pos)) return "mid";
  return "att";
}

export const GROUP_TIER_THRESHOLDS: Record<PositionGroup, TierThresholds> = {
  def: { sPlus: 88, s: 85, a: 83, b: 80, c: 76 },
  mid: { sPlus: 90, s: 88, a: 85, b: 82, c: 78 },
  att: { sPlus: 91, s: 88, a: 86, b: 83, c: 79 },
  gk:  { sPlus: 96, s: 91, a: 86, b: 81, c: 75 },
  all: { sPlus: 90, s: 87, a: 85, b: 82, c: 78 },
};

export const DEFAULT_OUTFIELD_THRESHOLDS: TierThresholds = GROUP_TIER_THRESHOLDS.all;

export const DEFAULT_GK_THRESHOLDS: TierThresholds = GROUP_TIER_THRESHOLDS.gk;

/**
 * Atributos clave por familia de posición según especificaciones del usuario
 */
export const POSITION_KEY_STATS: Record<string, string[]> = {
  GK: ["DEFENSE", "GOAL KEEPING"],
  CB: ["DEFENSE", "BALANCE", "TOP SPEED", "ACCELERATION", "JUMP", "RESPONSE", "AGGRESSION", "MENTALITY"],
  LB: ["DEFENSE", "BALANCE", "TOP SPEED", "ACCELERATION", "JUMP", "RESPONSE", "AGGRESSION", "MENTALITY"],
  RB: ["DEFENSE", "BALANCE", "TOP SPEED", "ACCELERATION", "JUMP", "RESPONSE", "AGGRESSION", "MENTALITY"],
  SW: ["DEFENSE", "BALANCE", "TOP SPEED", "ACCELERATION", "JUMP", "RESPONSE", "AGGRESSION", "MENTALITY"],
  DMF: ["DEFENSE", "BALANCE", "SHORT PASS ACCURACY", "LONG PASS ACCURACY", "STAMINA", "TOP SPEED", "ACCELERATION", "AGGRESSION", "RESPONSE"],
  CMF: ["DEFENSE", "BALANCE", "SHORT PASS ACCURACY", "LONG PASS ACCURACY", "STAMINA", "TOP SPEED", "ACCELERATION", "AGGRESSION", "RESPONSE"],
  AMF: ["ATTACK", "BALANCE", "RESPONSE", "STAMINA", "AGILITY", "DRIBBLE ACCURACY", "DRIBBLE SPEED", "SHORT PASS ACCURACY", "LONG PASS ACCURACY", "SHOT ACCURACY", "SHOT TECHNIQUE", "TOP SPEED", "ACCELERATION", "AGGRESSION", "TECHNIQUE"],
  LMF: ["ATTACK", "BALANCE", "RESPONSE", "STAMINA", "AGILITY", "DRIBBLE ACCURACY", "DRIBBLE SPEED", "SHORT PASS ACCURACY", "LONG PASS ACCURACY", "SHOT ACCURACY", "SHOT TECHNIQUE", "TOP SPEED", "ACCELERATION", "AGGRESSION", "TECHNIQUE"],
  RMF: ["ATTACK", "BALANCE", "RESPONSE", "STAMINA", "AGILITY", "DRIBBLE ACCURACY", "DRIBBLE SPEED", "SHORT PASS ACCURACY", "LONG PASS ACCURACY", "SHOT ACCURACY", "SHOT TECHNIQUE", "TOP SPEED", "ACCELERATION", "AGGRESSION", "TECHNIQUE"],
  CF: ["ATTACK", "BALANCE", "TOP SPEED", "ACCELERATION", "SHOT ACCURACY", "SHOT TECHNIQUE", "STAMINA", "AGILITY", "DRIBBLE ACCURACY", "DRIBBLE SPEED", "RESPONSE", "AGGRESSION", "MENTALITY", "TECHNIQUE"],
  SS: ["ATTACK", "BALANCE", "TOP SPEED", "ACCELERATION", "SHOT ACCURACY", "SHOT TECHNIQUE", "STAMINA", "AGILITY", "DRIBBLE ACCURACY", "DRIBBLE SPEED", "RESPONSE", "AGGRESSION", "MENTALITY", "TECHNIQUE"],
  LWF: ["ATTACK", "BALANCE", "TOP SPEED", "ACCELERATION", "SHOT ACCURACY", "SHOT TECHNIQUE", "STAMINA", "AGILITY", "DRIBBLE ACCURACY", "DRIBBLE SPEED", "RESPONSE", "AGGRESSION", "MENTALITY", "TECHNIQUE"],
  RWF: ["ATTACK", "BALANCE", "TOP SPEED", "ACCELERATION", "SHOT ACCURACY", "SHOT TECHNIQUE", "STAMINA", "AGILITY", "DRIBBLE ACCURACY", "DRIBBLE SPEED", "RESPONSE", "AGGRESSION", "MENTALITY", "TECHNIQUE"]
};

/**
 * Calcula la media/valoración de un portero basándose exclusivamente en sus estadísticas de portería y defensa.
 * Fórmula: (defending + goalkeeping) / 2.
 * Si 'goalkeeping' no está presente o es nulo, usa 'defending' (o overall si defending es nulo).
 */
export function calcGoalkeeperRating(player: {
  defending?: number | null;
  goalkeeping?: number | null;
  overall?: number | null;
}): number {
  const gk = (player as any).goalkeeping;
  const def = Number(player.defending ?? 0);

  if (gk != null && !isNaN(Number(gk))) {
    return Math.round((def + Number(gk)) / 2);
  }

  if (player.overall != null && !isNaN(Number(player.overall)) && Number(player.overall) > 0) {
    return Math.round(Number(player.overall));
  }

  return Math.round(def || 0);
}

/**
 * Obtiene la media efectiva de un jugador.
 * Para porteros (GK), solo cuenta defensa y portería (calcGoalkeeperRating).
 * Para jugadores de campo, cuenta su media general (overall).
 */
export function getPlayerEffectiveRating(player: {
  position?: string;
  overall?: number | null;
  defending?: number | null;
  goalkeeping?: number | null;
}): number {
  if (player.position?.toUpperCase() === "GK") {
    return calcGoalkeeperRating(player);
  }
  return player.overall ?? 0;
}

/**
 * Calcula dinámicamente los umbrales de tiers para jugadores de campo y porteros
 * basándose en los promedios de la liga.
 */
export function calcTierThresholds(
  players: Array<{
    position?: string;
    overall?: number | null;
    defending?: number | null;
    goalkeeping?: number | null;
  }>,
): { outfield: TierThresholds; gk: TierThresholds } {
  if (!players || players.length === 0) {
    return {
      outfield: DEFAULT_OUTFIELD_THRESHOLDS,
      gk: DEFAULT_GK_THRESHOLDS,
    };
  }

  let outfieldSum = 0;
  let outfieldCount = 0;
  let gkSum = 0;
  let gkCount = 0;

  for (const p of players) {
    if (p.position?.toUpperCase() === "GK") {
      const rating = calcGoalkeeperRating(p);
      if (rating > 0) {
        gkSum += rating;
        gkCount++;
      }
    } else {
      const rating = p.overall ?? 0;
      if (rating > 0) {
        outfieldSum += rating;
        outfieldCount++;
      }
    }
  }

  const outfieldAvg = outfieldCount > 0 ? Math.round(outfieldSum / outfieldCount) : 80;
  const gkAvg = gkCount > 0 ? Math.round(gkSum / gkCount) : 85;

  return {
    outfield: {
      sPlus: outfieldAvg + 9, // ej: 80 + 9 = 89 (Leyendas Top)
      s: outfieldAvg + 5,     // ej: 80 + 5 = 85 (Clase Mundial)
      a: outfieldAvg + 2,     // ej: 80 + 2 = 82 (Estrellas)
      b: outfieldAvg - 2,     // ej: 80 - 2 = 78 (Titulares)
      c: outfieldAvg - 6,     // ej: 80 - 6 = 74 (Rotación)
    },
    gk: {
      sPlus: gkAvg + 10,      // ej: 85 + 10 = 95
      s: gkAvg + 5,           // ej: 85 + 5 = 90
      a: gkAvg,               // ej: 85
      b: gkAvg - 5,           // ej: 85 - 5 = 80
      c: gkAvg - 15,          // ej: 85 - 15 = 70
    },
  };
}

let activeTierThresholds: { outfield: TierThresholds; gk: TierThresholds } | null = null;

export function setGlobalTierThresholds(thresholds: {
  outfield: TierThresholds;
  gk: TierThresholds;
}) {
  activeTierThresholds = thresholds;
}

/**
 * Devuelve el Tier de un jugador según su media/valoración y su posición.
 * Soporta invocación con (overall, position), o con (playerObject, position).
 * Asigna S+ al C según los umbrales correspondientes a su rol (portero o jugador de campo).
 */
export function getPlayerTier(
  overallOrPlayer:
    | number
    | null
    | undefined
    | {
        position?: string;
        overall?: number | null;
        defending?: number | null;
        goalkeeping?: number | null;
      },
  position?: string,
  customThresholds?: TierThresholds,
  groupContext?: PositionGroup,
): TierInfo {
  let media = 0;
  let pos = position;

  if (typeof overallOrPlayer === "object" && overallOrPlayer !== null) {
    pos = overallOrPlayer.position ?? position;
    media = getPlayerEffectiveRating(overallOrPlayer);
  } else {
    media = overallOrPlayer || 0;
  }

  const group: PositionGroup = groupContext ?? (pos ? getPositionGroup(pos) : "all");
  const thresholds =
    customThresholds ??
    GROUP_TIER_THRESHOLDS[group] ??
    DEFAULT_OUTFIELD_THRESHOLDS;

  if (media >= thresholds.sPlus) {
    return {
      tier: "S+",
      label: "Leyenda / Top",
      color: "text-purple-600 dark:text-purple-400 font-extrabold",
      bgColor:
        "bg-purple-500/10 border border-purple-500/30 dark:bg-purple-500/20",
    };
  }
  if (media >= thresholds.s) {
    return {
      tier: "S",
      label: "Clase Mundial",
      color: "text-amber-600 dark:text-amber-400 font-bold",
      bgColor: "bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/20",
    };
  }
  if (media >= thresholds.a) {
    return {
      tier: "A",
      label: "Estrella",
      color: "text-sky-600 dark:text-sky-400 font-bold",
      bgColor: "bg-sky-500/10 border border-sky-500/30 dark:bg-sky-500/20",
    };
  }
  if (media >= thresholds.b) {
    return {
      tier: "B",
      label: "Titular",
      color: "text-emerald-600 dark:text-emerald-400 font-semibold",
      bgColor:
        "bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-500/20",
    };
  }
  if (media >= thresholds.c) {
    return {
      tier: "C",
      label: "Rotación",
      color: "text-slate-600 dark:text-slate-300 font-medium",
      bgColor: "bg-slate-500/10 border border-slate-500/30 dark:bg-slate-500/20",
    };
  }

  return {
    tier: "D",
    label: "Reserva",
    color: "text-zinc-500 dark:text-zinc-400 font-medium",
    bgColor: "bg-zinc-500/10 border border-zinc-500/20 dark:bg-zinc-500/20",
  };
}

export type TierName = "S+" | "S" | "A" | "B" | "C" | "D";

export const TIER_FIXED_PRICES: Record<TierName, number> = {
  "S+": 180_000_000,
  "S":   80_000_000,
  "A":   35_000_000,
  "B":   15_000_000,
  "C":    5_000_000,
  "D":    1_000_000,
};

export const TIER_CONTRACT_DURATIONS: Record<TierName, number> = {
  "S+": 1,
  "S":   2,
  "A":   3,
  "B":   3,
  "C":   4,
  "D":   4,
};

export const TIER_RENEWAL_PERCENTAGES: Record<TierName, number> = {
  "S+": 0.50,
  "S":   0.40,
  "A":   0.25,
  "B":   0.05,
  "C":   0,
  "D":   0,
};

export function getPlayerTierName(playerOrTier: any): TierName {
  if (typeof playerOrTier === "string") {
    return (["S+", "S", "A", "B", "C", "D"].includes(playerOrTier) ? playerOrTier : "D") as TierName;
  }
  return (getPlayerTier(playerOrTier).tier as TierName) || "D";
}

export function getPlayerFixedPrice(playerOrTier: any): number {
  const tier = getPlayerTierName(playerOrTier);
  return TIER_FIXED_PRICES[tier] ?? 1_000_000;
}

export function getPlayerContractDuration(playerOrTier: any): number {
  const tier = getPlayerTierName(playerOrTier);
  return TIER_CONTRACT_DURATIONS[tier] ?? 4;
}

export function getPlayerRenewalCost(playerOrTier: any): number {
  const tier = getPlayerTierName(playerOrTier);
  const price = getPlayerFixedPrice(tier);
  const percent = TIER_RENEWAL_PERCENTAGES[tier] ?? 0;
  return Math.round(price * percent);
}

export interface PlayerContractInfo {
  tier: TierName;
  price: number;
  duration: number;
  durationLabel: string;
  durationBadge: string;
  renewalPercent: number;
  renewalPercentLabel: string;
  renewalCost: number;
  renewalCostLabel: string;
}

export function getPlayerContractInfo(playerOrTier: any): PlayerContractInfo {
  const tier = getPlayerTierName(playerOrTier);
  const price = TIER_FIXED_PRICES[tier] ?? 1_000_000;
  const duration = TIER_CONTRACT_DURATIONS[tier] ?? 4;
  const renewalPercent = TIER_RENEWAL_PERCENTAGES[tier] ?? 0;
  const renewalCost = Math.round(price * renewalPercent);

  return {
    tier,
    price,
    duration,
    durationLabel: duration === 1 ? "1 Temporada" : `${duration} Temporadas`,
    durationBadge: `⏳ ${duration} ${duration === 1 ? "Temp." : "Temps."}`,
    renewalPercent,
    renewalPercentLabel: renewalPercent > 0 ? `${Math.round(renewalPercent * 100)}%` : "Gratis",
    renewalCost,
    renewalCostLabel: renewalCost > 0 ? `€${renewalCost.toLocaleString("es-ES")}` : "Gratis",
  };
}

/**
 * Calcula el precio fijo de un jugador en base a su Tier calibrado por posición.
 */
export function calculatePlayerPrice(playerOrOverall: any, position?: string): number {
  if (!playerOrOverall) return 1_000_000;
  if (typeof playerOrOverall === "object") {
    return getPlayerFixedPrice(playerOrOverall);
  }
  if (typeof playerOrOverall === "number") {
    const tier = getPlayerTier(playerOrOverall, position).tier;
    return getPlayerFixedPrice(tier);
  }
  return getPlayerFixedPrice(playerOrOverall);
}

/**
 * Formatea un número grande a formato moneda amigable (ej: 1,500,000 -> "1.5M")
 */
export function formatPlayerPrice(price: number): string {
  if (price >= 1_000_000) {
    return `€${(price / 1_000_000).toFixed(1).replace(".0", "")}M`;
  }
  if (price >= 1_000) {
    return `€${(price / 1_000).toFixed(0)}K`;
  }
  return `€${price.toString()}`;
}
