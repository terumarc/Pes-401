/**
 * Lógica financiera y de recompensas (Economía de la liga)
 */

export const ECONOMY_CONFIG = {
  // Presupuestos iniciales (Se otorgan al iniciar la temporada)
  STARTING_BUDGET_BASE: 200_000_000, // Por defecto para ligas nuevas
  STARTING_BUDGET_MIN: 150_000_000,  // Castigo por ir 1º en la liga anterior
  STARTING_BUDGET_MAX: 250_000_000,  // Ayuda para el que quedó último
  
  // Recompensas base por partido (Justas para todos, sin multiplicadores)
  MATCH_REWARDS: {
    WIN: 3_000_000,
    DRAW: 1_000_000,
    LOSS: 500_000,
  }
};

/**
 * Devuelve la recompensa financiera plana tras un partido.
 */
export function calculateMatchReward(result: "win" | "draw" | "loss"): number {
  if (result === "win") return ECONOMY_CONFIG.MATCH_REWARDS.WIN;
  if (result === "draw") return ECONOMY_CONFIG.MATCH_REWARDS.DRAW;
  return ECONOMY_CONFIG.MATCH_REWARDS.LOSS;
}

/**
 * Calcula el presupuesto inicial de un equipo para una nueva temporada
 * basándose en su posición en la temporada anterior (Mecánica de Catch-up).
 * 
 * @param previousPosition Posición del equipo en la liga pasada (1 = campeón)
 * @param totalTeams Total de equipos en la liga
 */
export function calculateStartingBudget(
  previousPosition?: number | null, 
  totalTeams?: number
): number {
  // Si es la primera temporada o no hay datos, todos reciben el mismo presupuesto base
  if (!previousPosition || !totalTeams || totalTeams <= 1) {
    return ECONOMY_CONFIG.STARTING_BUDGET_BASE; 
  }

  // 1º lugar recibe el MIN (ej. 150M)
  // Último lugar recibe el MAX (ej. 250M)
  const positionIndex = Math.max(0, previousPosition - 1);
  const budgetRange = ECONOMY_CONFIG.STARTING_BUDGET_MAX - ECONOMY_CONFIG.STARTING_BUDGET_MIN;
  
  const extraBudget = (positionIndex / (totalTeams - 1)) * budgetRange;
  
  // Redondeamos para que los números queden limpios
  return Math.round(ECONOMY_CONFIG.STARTING_BUDGET_MIN + extraBudget);
}

