import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ActivityRow = Database["public"]["Tables"]["activity_log"]["Row"];

/** Grupos para filtrar los movimientos. */
export const ACTIVITY_GROUPS = {
  fichajes: ["signing", "release", "transfer", "contract_released"],
  ofertas: ["offer_made", "offer_accepted", "offer_rejected", "offer_cancelled", "offer_expired"],
  partidos: ["match", "cup_match"],
  dinero: ["salary", "renewal", "prize_position", "trophy", "trophy_removed", "budget_adjust", "card"],
} as const;

export type ActivityGroup = keyof typeof ACTIVITY_GROUPS;

export function isActivityGroup(v: string | undefined): v is ActivityGroup {
  return !!v && v in ACTIVITY_GROUPS;
}

/**
 * Movimientos visibles para quien ha entrado (las ofertas solo las ven los
 * dos clubes y los admins: lo decide la base de datos).
 */
export async function getActivity({
  teamId,
  group,
  limit = 100,
}: {
  teamId?: string | null;
  group?: ActivityGroup;
  limit?: number;
}): Promise<ActivityRow[]> {
  const supabase = await createClient();
  let q = supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (teamId) q = q.or(`team_id.eq.${teamId},other_team_id.eq.${teamId}`);
  if (group) q = q.in("kind", [...ACTIVITY_GROUPS[group]]);
  const { data, error } = await q;
  if (error) return [];
  return data ?? [];
}

/**
 * Cuánto dinero supone el movimiento para ese club: positivo si entra,
 * negativo si sale, null si no mueve dinero.
 */
export function amountFor(row: ActivityRow, teamId?: string | null): number | null {
  const a = row.amount;
  if (a == null || a === 0) return null;
  switch (row.kind) {
    case "signing":
    case "salary":
    case "renewal":
      return -a;
    case "release":
    case "prize_position":
    case "trophy":
      return a;
    case "trophy_removed":
      return -a;
    case "budget_adjust":
      return a;
    case "card":
      // El importe es desde el punto de vista del club que sacó la carta.
      if (!teamId || teamId === row.team_id) return a;
      return cardShareFor(row, teamId);
    case "transfer":
      if (!teamId) return a;
      return teamId === row.team_id ? -a : a;
    default:
      return null;
  }
}

/** Movimientos de dinero con signo; el resto (ofertas, partidos) no se suman. */
export function movesMoney(row: ActivityRow): boolean {
  return ["signing", "salary", "renewal", "release", "prize_position", "trophy", "trophy_removed", "budget_adjust", "transfer", "card"].includes(
    row.kind,
  );
}

/** Lo que una carta le supone a otro club implicado (los importes de transfers son del que la sacó). */
function cardShareFor(row: ActivityRow, teamId: string): number | null {
  const transfers = (row.payload as { transfers?: { team_id?: string; amount?: number }[] } | null)?.transfers;
  const t = transfers?.find((x) => x.team_id === teamId);
  return t?.amount ? -t.amount : null;
}
