/**
 * Money is stored as INTEGER euros (never floats / never strings in DB).
 * Example: 100000000 → €100.000.000
 */
export function formatMoney(amountEuros: number, locale = "es-ES"): string {
  const safe = Number.isFinite(amountEuros) ? Math.trunc(amountEuros) : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(safe);
}

/** Parse user money input ("100.000.000", "€100M", "100000000") → euros integer */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "");

  if (!cleaned) return null;

  const match = cleaned.match(/^(\d+)(m|k)?$/i);
  if (!match) return null;

  let value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value)) return null;

  const suffix = match[2]?.toLowerCase();
  if (suffix === "m") value *= 1_000_000;
  if (suffix === "k") value *= 1_000;

  return value;
}

export function getBudgetPercentage(
  budget: number,
  maxBudget: number,
): number {
  if (maxBudget <= 0) return 0;
  return Math.max(0, Math.min(100, (budget / maxBudget) * 100));
}
