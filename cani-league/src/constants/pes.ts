import type { PesStats } from "@/types";

export type PesStatKey = keyof PesStats;

export type PesStatCategory =
  | "ataque"
  | "tecnica"
  | "velocidad"
  | "fisico_defensa"
  | "porteria";

export type PesStatDefinition = {
  key: PesStatKey;
  pesName: string;
  label: string;
  shortLabel: string;
  category: PesStatCategory;
};

export const PES_CATEGORIES: { id: PesStatCategory | "all"; label: string }[] = [
  { id: "all", label: "Todas (26)" },
  { id: "ataque", label: "Ataque y Disparo" },
  { id: "tecnica", label: "Pase y Técnica" },
  { id: "velocidad", label: "Velocidad y Regate" },
  { id: "fisico_defensa", label: "Físico y Defensa" },
  { id: "porteria", label: "Portería" },
];

export const PES_STAT_DEFINITIONS: PesStatDefinition[] = [
  // 1. ATTACK
  {
    key: "attack",
    pesName: "ATTACK",
    label: "Ataque",
    shortLabel: "ATA",
    category: "ataque",
  },
  // 2. DEFENSE
  {
    key: "defense",
    pesName: "DEFENSE",
    label: "Defensa",
    shortLabel: "DEF",
    category: "fisico_defensa",
  },
  // 3. BALANCE
  {
    key: "balance",
    pesName: "BALANCE",
    label: "Equilibrio",
    shortLabel: "EQU",
    category: "fisico_defensa",
  },
  // 4. STAMINA
  {
    key: "stamina",
    pesName: "STAMINA",
    label: "Resistencia",
    shortLabel: "RES",
    category: "fisico_defensa",
  },
  // 5. TOP SPEED
  {
    key: "top_speed",
    pesName: "TOP SPEED",
    label: "Velocidad máxima",
    shortLabel: "VEL",
    category: "velocidad",
  },
  // 6. ACCELERATION
  {
    key: "acceleration",
    pesName: "ACCELERATION",
    label: "Aceleración",
    shortLabel: "ACE",
    category: "velocidad",
  },
  // 7. RESPONSE
  {
    key: "response",
    pesName: "RESPONSE",
    label: "Respuesta / Reflejos",
    shortLabel: "REF",
    category: "fisico_defensa",
  },
  // 8. AGILITY
  {
    key: "agility",
    pesName: "AGILITY",
    label: "Agilidad",
    shortLabel: "AGI",
    category: "velocidad",
  },
  // 9. DRIBBLE ACCURACY
  {
    key: "dribble_accuracy",
    pesName: "DRIBBLE ACCURACY",
    label: "Precisión de regate",
    shortLabel: "REG",
    category: "tecnica",
  },
  // 10. DRIBBLE SPEED
  {
    key: "dribble_speed",
    pesName: "DRIBBLE SPEED",
    label: "Velocidad de regate",
    shortLabel: "V.REG",
    category: "velocidad",
  },
  // 11. SHORT PASS ACCURACY
  {
    key: "short_pass_accuracy",
    pesName: "SHORT PASS ACCURACY",
    label: "Precisión pase corto",
    shortLabel: "P.COR",
    category: "tecnica",
  },
  // 12. SHORT PASS SPEED
  {
    key: "short_pass_speed",
    pesName: "SHORT PASS SPEED",
    label: "Velocidad pase corto",
    shortLabel: "V.COR",
    category: "tecnica",
  },
  // 13. LONG PASS ACCURACY
  {
    key: "long_pass_accuracy",
    pesName: "LONG PASS ACCURACY",
    label: "Precisión pase largo",
    shortLabel: "P.LAR",
    category: "tecnica",
  },
  // 14. LONG PASS SPEED
  {
    key: "long_pass_speed",
    pesName: "LONG PASS SPEED",
    label: "Velocidad pase largo",
    shortLabel: "V.LAR",
    category: "tecnica",
  },
  // 15. SHOT ACCURACY
  {
    key: "shot_accuracy",
    pesName: "SHOT ACCURACY",
    label: "Precisión de disparo",
    shortLabel: "P.DIS",
    category: "ataque",
  },
  // 16. SHOT POWER
  {
    key: "shot_power",
    pesName: "SHOT POWER",
    label: "Potencia de disparo",
    shortLabel: "POT",
    category: "ataque",
  },
  // 17. SHOT TECHNIQUE
  {
    key: "shot_technique",
    pesName: "SHOT TECHNIQUE",
    label: "Técnica de disparo",
    shortLabel: "T.DIS",
    category: "ataque",
  },
  // 18. FREE KICK ACCURACY
  {
    key: "free_kick_accuracy",
    pesName: "FREE KICK ACCURACY",
    label: "Faltas / Balón parado",
    shortLabel: "FAL",
    category: "ataque",
  },
  // 19. SWERVE
  {
    key: "swerve",
    pesName: "SWERVE",
    label: "Efecto / Rosca",
    shortLabel: "EFE",
    category: "ataque",
  },
  // 20. HEADING
  {
    key: "heading",
    pesName: "HEADING",
    label: "Cabezazo",
    shortLabel: "CAB",
    category: "ataque",
  },
  // 21. JUMP
  {
    key: "jump",
    pesName: "JUMP",
    label: "Salto",
    shortLabel: "SAL",
    category: "fisico_defensa",
  },
  // 22. TECHNIQUE
  {
    key: "technique",
    pesName: "TECHNIQUE",
    label: "Técnica",
    shortLabel: "TEC",
    category: "tecnica",
  },
  // 23. AGGRESSION
  {
    key: "aggression",
    pesName: "AGGRESSION",
    label: "Agresividad",
    shortLabel: "AGR",
    category: "fisico_defensa",
  },
  // 24. MENTALITY
  {
    key: "mentality",
    pesName: "MENTALITY",
    label: "Mentalidad",
    shortLabel: "MEN",
    category: "fisico_defensa",
  },
  // 25. GOAL KEEPING
  {
    key: "goal_keeping",
    pesName: "GOAL KEEPING",
    label: "Cualidad de portero",
    shortLabel: "POR",
    category: "porteria",
  },
  // 26. TEAM WORK
  {
    key: "team_work",
    pesName: "TEAM WORK",
    label: "Trabajo en equipo",
    shortLabel: "EQUIP",
    category: "fisico_defensa",
  },
];

export function getPesStatColor(val: number | null | undefined): {
  text: string;
  bg: string;
  border: string;
  badge: string;
  hex: string;
} {
  const v = val ?? 0;
  if (v >= 95) {
    return {
      text: "text-rose-500",
      bg: "bg-rose-500",
      border: "border-rose-500/40",
      badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      hex: "#f43f5e",
    };
  }
  if (v >= 90) {
    return {
      text: "text-orange-500",
      bg: "bg-orange-500",
      border: "border-orange-500/40",
      badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      hex: "#f97316",
    };
  }
  if (v >= 80) {
    return {
      text: "text-amber-400",
      bg: "bg-amber-400",
      border: "border-amber-400/40",
      badge: "bg-amber-400/15 text-amber-300 border-amber-400/30",
      hex: "#fbbf24",
    };
  }
  if (v >= 75) {
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-400",
      border: "border-emerald-400/40",
      badge: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
      hex: "#34d399",
    };
  }
  return {
    text: "text-slate-400",
    bg: "bg-slate-500/40",
    border: "border-slate-500/30",
    badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    hex: "#94a3b8",
  };
}

export function estimatePesStatsFromLegacy(player: {
  speed?: number | null;
  acceleration?: number | null;
  shooting?: number | null;
  passing?: number | null;
  dribbling?: number | null;
  defending?: number | null;
  physical?: number | null;
  overall?: number | null;
  position?: string;
}): PesStats {
  const spd = player.speed ?? 65;
  const acc = player.acceleration ?? 65;
  const sho = player.shooting ?? 65;
  const pas = player.passing ?? 65;
  const dri = player.dribbling ?? 65;
  const def = player.defending ?? 65;
  const phy = player.physical ?? 65;
  const ovr = player.overall ?? 65;

  return {
    attack: sho,
    defense: def,
    balance: phy,
    stamina: phy,
    top_speed: spd,
    acceleration: acc,
    response: Math.round((def + acc) / 2),
    agility: Math.round((dri + acc) / 2),
    dribble_accuracy: dri,
    dribble_speed: Math.round((dri + spd) / 2),
    short_pass_accuracy: pas,
    short_pass_speed: pas,
    long_pass_accuracy: pas,
    long_pass_speed: pas,
    shot_accuracy: sho,
    shot_power: sho,
    shot_technique: sho,
    free_kick_accuracy: Math.round((sho + pas) / 2),
    swerve: pas,
    heading: Math.round((phy + sho) / 2),
    jump: phy,
    technique: dri,
    aggression: Math.round((phy + def) / 2),
    mentality: ovr,
    goal_keeping: player.position === "GK" ? ovr : 50,
    team_work: pas,
  };
}

