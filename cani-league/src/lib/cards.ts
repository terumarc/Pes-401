/**
 * Cartas de Suerte y Caja B: tipos y textos que comparten el servidor y el navegador.
 * El sorteo y el dinero los hace la base de datos (draw_card / reveal_card).
 */

export type Deck = "suerte" | "cajab";
export type Faction = "fede" | "antifede" | "cefa";
export type Rarity = "comun" | "medio" | "raro" | "legendario" | "choque" | "clubes";

export type CardTransfer = { team_id: string; team_name: string; amount: number };

/** Una carta sacada, con lo que hace falta para pintarla. */
export type CardDraw = {
  id: string;
  createdAt: string;
  teamId: string;
  teamName: string;
  deck: Deck;
  rarity: Rarity;
  faction: Faction | null;
  icon: string;
  text: string;
  amount: number;
  transfers: CardTransfer[];
  status: "pending" | "revealed";
  /** «tras el Macedonios 1-3 Harris United F.C.», si se sabe el partido. */
  matchLabel: string | null;
};

export const DECK_LABEL: Record<Deck, string> = { suerte: "Suerte", cajab: "Caja B" };

export const FACTION_LABEL: Record<Faction, string> = { fede: "La Fede", antifede: "La Antifede", cefa: "La CEFA" };
export const FACTION_SHORT: Record<Faction, string> = { fede: "FEDE", antifede: "ANTIFEDE", cefa: "CEFA" };

export const RARITY_LABEL: Record<Rarity, string> = {
  comun: "Común",
  medio: "Medio",
  raro: "Raro",
  legendario: "Legendario",
  choque: "Choque",
  clubes: "Entre clubes",
};

/** 6M, 1,5M, 300.000 € */
export function formatMillions(euros: number): string {
  const abs = Math.abs(euros);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M`;
  }
  return `${new Intl.NumberFormat("es-ES").format(abs)} €`;
}

export function signedMillions(euros: number): string {
  if (euros === 0) return "0M";
  return `${euros > 0 ? "+" : "−"}${formatMillions(euros)}`;
}

/** La orden al pie de la carta, al estilo del Monopoly: «PAGUE 6M», «COBRE 3M DE CUM MAKERS». */
export function cardOrder(card: Pick<CardDraw, "amount" | "transfers">): string {
  const { amount, transfers } = card;
  if (transfers.length === 0) {
    if (amount === 0) return "NO HABÍA CON QUÉ PAGAR";
    return amount > 0 ? `COBRE ${formatMillions(amount)}` : `PAGUE ${formatMillions(amount)}`;
  }
  if (transfers.length === 1) {
    const t = transfers[0];
    const who = t.team_name.toUpperCase();
    if (t.amount === 0) return `${who} NO TENÍA CON QUÉ PAGAR`;
    return t.amount > 0 ? `COBRE ${formatMillions(t.amount)} DE ${who}` : `PAGUE ${formatMillions(t.amount)} A ${who}`;
  }
  const same = transfers.every((t) => t.amount === transfers[0].amount);
  const first = transfers[0].amount;
  if (same && first !== 0) {
    return first > 0 ? `COBRE ${formatMillions(first)} DE CADA UNO` : `PAGUE ${formatMillions(first)} A CADA UNO`;
  }
  if (amount === 0) return "NI COBRA NI PAGA";
  return amount > 0 ? `COBRE ${formatMillions(amount)} EN TOTAL` : `PAGUE ${formatMillions(amount)} EN TOTAL`;
}

export function toCardTransfers(value: unknown): CardTransfer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      team_id: String(x.team_id ?? ""),
      team_name: String(x.team_name ?? ""),
      amount: Number(x.amount ?? 0),
    }));
}
