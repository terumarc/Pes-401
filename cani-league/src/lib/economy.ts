/**
 * Lógica financiera y de recompensas (Economía de la liga)
 */

export const ECONOMY_CONFIG = {
  // Presupuesto inicial único por defecto (plano para todos los equipos)
  STARTING_BUDGET_BASE: 50_000_000,
  STARTING_BUDGET_MIN: 50_000_000,
  STARTING_BUDGET_MAX: 50_000_000,
  
  // Premio por posición en la liga (se cobra solo al acabar la temporada)
  POSITION_REWARDS: {
    BASE: 25_000_000,
    INCREMENT: 5_000_000,
  },
};

export const BASE_POSITION_REWARD = ECONOMY_CONFIG.POSITION_REWARDS.BASE;
export const POSITION_INCREMENT = ECONOMY_CONFIG.POSITION_REWARDS.INCREMENT;

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

