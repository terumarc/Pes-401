import {
  TIER_CONTRACT_DURATIONS,
  TIER_FIXED_PRICES,
  TIER_RENEWAL_PERCENTAGES,
  getPlayerTierName,
  type TierName,
} from "@/lib/players";

/**
 * Contratos: los jugadores no cobran sueldo. Cada contrato dura unas temporadas según su
 * nivel y cumple un año en el mercado en el que fichó (invierno o inicio de temporada).
 * Cuando llega a 0, el club decide si lo renueva pagando el % de renovación de su nivel.
 */

export const TIERS: TierName[] = ["S+", "S", "A", "B", "C", "D"];

/** % del precio que cuesta renovar cada nivel. Valores de partida; se cambian en Finanzas. */
export const DEFAULT_RENEWAL_PERCENT: Record<TierName, number> = Object.fromEntries(
  TIERS.map((t) => [t, Math.round(TIER_RENEWAL_PERCENTAGES[t] * 100)]),
) as Record<TierName, number>;

export type RenewalTable = Record<TierName, number>;

/** Mercado en el que el contrato cumple años: el de invierno o el de inicio de temporada. */
export type ContractAnchor = "summer" | "winter";

export const ANCHOR_LABEL: Record<ContractAnchor, string> = {
  summer: "mercado de inicio de temporada",
  winter: "mercado de invierno",
};

type ContractPlayer = {
  position?: string;
  overall?: number | null;
  defending?: number | null;
  contract_seasons_left?: number | null;
  contract_anchor?: string | null;
};

export function anchorOf(player: ContractPlayer): ContractAnchor {
  return player.contract_anchor === "winter" ? "winter" : "summer";
}

/** Temporadas de contrato de su nivel (0 = sin contrato). */
export function getContractDuration(player: ContractPlayer): number {
  return TIER_CONTRACT_DURATIONS[getPlayerTierName(player)];
}

/** Temporadas que le quedan al contrato (null en la base de datos = contrato completo). */
export function getSeasonsLeft(player: ContractPlayer): number {
  const duration = getContractDuration(player);
  if (duration === 0) return 0;
  const left = player.contract_seasons_left;
  return left == null ? duration : Math.max(0, Math.min(left, duration));
}

/** Contrato acabado y sin renovar. */
export function isContractExpired(player: ContractPlayer): boolean {
  return getContractDuration(player) > 0 && getSeasonsLeft(player) === 0;
}

/** Lo que cuesta renovarlo. */
export function getRenewalCost(player: ContractPlayer, renewals: RenewalTable = DEFAULT_RENEWAL_PERCENT): number {
  const tier = getPlayerTierName(player);
  return Math.round((TIER_FIXED_PRICES[tier] * (renewals[tier] ?? 0)) / 100);
}

/** Al abrir su mercado, el contrato cumple un año. Devuelve las temporadas que le quedan, o null si no tiene contrato. */
export function tickContract(player: ContractPlayer): number | null {
  if (getContractDuration(player) === 0) return null;
  return Math.max(0, getSeasonsLeft(player) - 1);
}
