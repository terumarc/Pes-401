import {
  TIER_CONTRACT_DURATIONS,
  TIER_FIXED_PRICES,
  TIER_RENEWAL_PERCENTAGES,
  getPlayerTierName,
  type TierName,
} from "@/lib/players";

export const TIERS: TierName[] = ["S+", "S", "A", "B", "C", "D"];

/**
 * Sueldo por temporada de cada nivel, en % de su precio fijo.
 * Valores de partida; cada liga los puede cambiar en Finanzas.
 */
export const DEFAULT_SALARY_PERCENT: Record<TierName, number> = {
  "S+": 15,
  S: 12,
  A: 8,
  B: 5,
  C: 0,
  D: 0,
};

export type SalaryTable = Record<TierName, number>;

type ContractPlayer = {
  position?: string;
  overall?: number | null;
  defending?: number | null;
  contract_seasons_left?: number | null;
};

/** Sueldo de un jugador por temporada según su nivel. */
export function getPlayerSalary(player: ContractPlayer, salaries: SalaryTable = DEFAULT_SALARY_PERCENT): number {
  const tier = getPlayerTierName(player);
  return Math.round((TIER_FIXED_PRICES[tier] * (salaries[tier] ?? 0)) / 100);
}

/**
 * Cuándo abrió el mercado de invierno: el último partido de la ida, si la ida ya acabó.
 * Quien llega a un club después paga media temporada de sueldo.
 */
export function winterStartOf(matches: { round: number | null; played: boolean | null; played_at: string | null }[]): string | null {
  const first = matches.filter((m) => (m.round ?? 1) === 1);
  if (first.length === 0 || !first.every((m) => m.played)) return null;
  return first.reduce<string | null>((max, m) => (m.played_at && (!max || m.played_at > max) ? m.played_at : max), null);
}

/** Parte de la temporada que paga: 0,5 si llegó en el mercado de invierno o después, 1 si no. */
export function salaryShareFor(joinedTeamAt: string | null | undefined, winterStart: string | null): number {
  return winterStart && joinedTeamAt && joinedTeamAt > winterStart ? 0.5 : 1;
}

/** Temporadas que le quedan al contrato (null en la base de datos = contrato completo). */
export function getSeasonsLeft(player: ContractPlayer): number {
  const duration = TIER_CONTRACT_DURATIONS[getPlayerTierName(player)];
  if (duration === 0) return 0;
  const left = player.contract_seasons_left;
  return left == null ? duration : Math.min(left, duration);
}

export type ContractStep = {
  kind: "salary" | "renewal" | "released";
  amount: number;
};

/**
 * Lo que le pasa a un jugador al cerrar la temporada, dado el dinero que le queda al club:
 * 1. Se cobra su sueldo. Si no hay dinero, queda libre.
 *    `salaryShare` es la parte de la temporada que ha estado en el club (0,5 si llegó en invierno).
 * 2. Su contrato baja una temporada. Si se acaba, se cobra la renovación y vuelve a empezar;
 *    si no hay dinero para renovar, queda libre.
 */
export function closeSeasonForPlayer(
  player: ContractPlayer,
  budget: number,
  salaries: SalaryTable,
  salaryShare = 1,
): { steps: ContractStep[]; budget: number; released: boolean; seasonsLeft: number | null } {
  const tier = getPlayerTierName(player);
  const duration = TIER_CONTRACT_DURATIONS[tier];
  const steps: ContractStep[] = [];

  const salary = Math.round(getPlayerSalary(player, salaries) * salaryShare);
  if (salary > 0) {
    if (budget < salary) return { steps: [{ kind: "released", amount: 0 }], budget, released: true, seasonsLeft: null };
    budget -= salary;
    steps.push({ kind: "salary", amount: salary });
  }

  if (duration === 0) return { steps, budget, released: false, seasonsLeft: null };

  const left = getSeasonsLeft(player) - 1;
  if (left > 0) return { steps, budget, released: false, seasonsLeft: left };

  const renewal = Math.round(TIER_FIXED_PRICES[tier] * TIER_RENEWAL_PERCENTAGES[tier]);
  if (renewal > 0) {
    if (budget < renewal) {
      steps.push({ kind: "released", amount: 0 });
      return { steps, budget, released: true, seasonsLeft: null };
    }
    budget -= renewal;
    steps.push({ kind: "renewal", amount: renewal });
  }
  return { steps, budget, released: false, seasonsLeft: duration };
}
