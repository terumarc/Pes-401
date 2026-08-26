export type PlayerTier = "S+" | "S" | "A" | "B" | "C" | "D";

export interface TierInfo {
  tier: PlayerTier;
  label: string;
  color: string; // Útil para Tailwind si quieres colorear las etiquetas
  bgColor: string;
}

/**
 * Devuelve el Tier de un jugador según su media (overall)
 */
export function getPlayerTier(overall: number | null | undefined): TierInfo {
  const media = overall || 0;
  
  if (media >= 90) return { tier: "S+", label: "Leyenda / Top", color: "text-purple-600", bgColor: "bg-purple-100" };
  if (media >= 85) return { tier: "S", label: "Clase Mundial", color: "text-yellow-600", bgColor: "bg-yellow-100" };
  if (media >= 80) return { tier: "A", label: "Estrella", color: "text-blue-600", bgColor: "bg-blue-100" };
  if (media >= 75) return { tier: "B", label: "Titular", color: "text-emerald-600", bgColor: "bg-emerald-100" };
  if (media >= 70) return { tier: "C", label: "Rotación", color: "text-gray-600", bgColor: "bg-gray-100" };
  
  return { tier: "D", label: "Reserva", color: "text-stone-600", bgColor: "bg-stone-100" };
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
