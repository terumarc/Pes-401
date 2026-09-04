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

export const DEFAULT_OUTFIELD_THRESHOLDS: TierThresholds = {
  sPlus: 85,
  s: 82,
  a: 78,
  b: 74,
  c: 70,
};

export const DEFAULT_GK_THRESHOLDS: TierThresholds = {
  sPlus: 95,
  s: 90,
  a: 85,
  b: 80,
  c: 70,
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
  const def = Number(player.defending ?? 0);
  const gk = (player as any).goalkeeping;

  if (gk != null && !isNaN(Number(gk))) {
    return Math.round((def + Number(gk)) / 2);
  }

  return Math.round(def || player.overall || 0);
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

  const outfieldAvg = outfieldCount > 0 ? Math.round(outfieldSum / outfieldCount) : 76;
  const gkAvg = gkCount > 0 ? Math.round(gkSum / gkCount) : 85;

  return {
    outfield: {
      sPlus: outfieldAvg + 9, // ej: 76 + 9 = 85
      s: outfieldAvg + 6,     // ej: 76 + 6 = 82
      a: outfieldAvg + 2,     // ej: 76 + 2 = 78
      b: outfieldAvg - 2,     // ej: 76 - 2 = 74
      c: outfieldAvg - 6,     // ej: 76 - 6 = 70
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
): TierInfo {
  let media = 0;
  let pos = position;

  if (typeof overallOrPlayer === "object" && overallOrPlayer !== null) {
    pos = overallOrPlayer.position ?? position;
    media = getPlayerEffectiveRating(overallOrPlayer);
  } else {
    media = overallOrPlayer || 0;
  }

  const isGK = pos?.toUpperCase() === "GK";

  const thresholds =
    customThresholds ??
    (isGK
      ? activeTierThresholds?.gk ?? DEFAULT_GK_THRESHOLDS
      : activeTierThresholds?.outfield ?? DEFAULT_OUTFIELD_THRESHOLDS);

  if (media >= thresholds.sPlus) {
    return {
      tier: "S+",
      label: isGK ? "Portero S+ (Leyenda)" : "Leyenda / Top",
      color: "text-purple-600 dark:text-purple-400 font-extrabold",
      bgColor:
        "bg-purple-500/10 border border-purple-500/30 dark:bg-purple-500/20",
    };
  }
  if (media >= thresholds.s) {
    return {
      tier: "S",
      label: isGK ? "Portero S (Clase Mundial)" : "Clase Mundial",
      color: "text-amber-600 dark:text-amber-400 font-bold",
      bgColor: "bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/20",
    };
  }
  if (media >= thresholds.a) {
    return {
      tier: "A",
      label: isGK ? "Portero A (Estrella)" : "Estrella",
      color: "text-sky-600 dark:text-sky-400 font-bold",
      bgColor: "bg-sky-500/10 border border-sky-500/30 dark:bg-sky-500/20",
    };
  }
  if (media >= thresholds.b) {
    return {
      tier: "B",
      label: isGK ? "Portero B (Titular)" : "Titular",
      color: "text-emerald-600 dark:text-emerald-400 font-semibold",
      bgColor:
        "bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-500/20",
    };
  }
  if (media >= thresholds.c) {
    return {
      tier: "C",
      label: isGK ? "Portero C (Rotación)" : "Rotación",
      color: "text-slate-600 dark:text-slate-300 font-medium",
      bgColor: "bg-slate-500/10 border border-slate-500/30 dark:bg-slate-500/20",
    };
  }

  return {
    tier: "D",
    label: isGK ? "Portero D (Reserva)" : "Reserva",
    color: "text-zinc-500 dark:text-zinc-400 font-medium",
    bgColor: "bg-zinc-500/10 border border-zinc-500/20 dark:bg-zinc-500/20",
  };
}

/**
 * Calcula el precio de un jugador basado en su media usando una fórmula matemática exponencial.
 * 
 * - Un jugador de media 70 cuesta aproximadamente 1,000,000.
 * - El precio aumenta de forma exponencial (aprox. 24% más caro por cada punto extra de media).
 */
export function calculatePlayerPrice(overall: number | null | undefined): number {
  if (!overall) return 0;
  
  const basePrice = 1_000_000;
  const multiplier = 1.24; // 24% de incremento por punto de media
  
  // Fórmula: Precio = Base * (Multiplier ^ (Media - 70))
  let price = basePrice * Math.pow(multiplier, overall - 70);
  
  // Redondear para evitar números raros y tener precios "limpios"
  if (price > 10_000_000) {
    // Redondear al medio millón más cercano si es muy caro
    price = Math.round(price / 500_000) * 500_000;
  } else if (price > 1_000_000) {
    // Redondear a 100k más cercanos
    price = Math.round(price / 100_000) * 100_000;
  } else {
    // Redondear a 10k más cercanos para los baratos
    price = Math.round(price / 10_000) * 10_000;
  }
  
  return price;
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
