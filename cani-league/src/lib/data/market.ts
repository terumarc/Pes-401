import { createStaticClient } from "@/lib/supabase/server";

export type OfferRow = {
  id: string;
  player_id: string;
  buyer_team_id: string;
  seller_team_id: string;
  amount: number;
  swap_player_id: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  resolved_at: string | null;
};

/** Ofertas de la liga: todas las pendientes y las últimas resueltas. */
export async function getOffers(leagueId: string, opts: { playerId?: string; resolvedLimit?: number } = {}): Promise<OfferRow[]> {
  const supabase = createStaticClient();
  let pending = supabase.from("transfer_offers").select("*").eq("league_id", leagueId).eq("status", "pending");
  let resolved = supabase.from("transfer_offers").select("*").eq("league_id", leagueId).neq("status", "pending");
  if (opts.playerId) {
    pending = pending.eq("player_id", opts.playerId);
    resolved = resolved.eq("player_id", opts.playerId);
  }
  const [p, r] = await Promise.all([
    pending.order("created_at", { ascending: false }),
    resolved.order("resolved_at", { ascending: false }).limit(opts.resolvedLimit ?? 10),
  ]);
  if (p.error) return []; // sin la tabla (migración 006) no hay ofertas
  return [...(p.data ?? []), ...(r.data ?? [])] as OfferRow[];
}

export type TransferRow = {
  id: string;
  player_id: string;
  player_name: string;
  from_team_id: string | null;
  from_team_name: string | null;
  to_team_id: string | null;
  to_team_name: string | null;
  fee: number;
  created_at: string;
};

/** Historial de fichajes, del más reciente al más antiguo. */
export async function getTransfers(leagueId: string, limit = 200): Promise<TransferRow[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as TransferRow[];
}
