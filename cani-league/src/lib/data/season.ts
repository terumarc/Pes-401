import type { SupabaseClient } from "@supabase/supabase-js";
import { marketWindow, type MarketWindow, type WindowMatch } from "@/lib/market-window";

/** Estado de la ventana de fichajes de la liga, según los partidos de la temporada en curso. */
export async function getMarketWindow(supabase: SupabaseClient, leagueId: string | null | undefined): Promise<MarketWindow> {
  if (!leagueId) {
    const { data } = await supabase.from("leagues").select("id").limit(1).maybeSingle();
    leagueId = (data?.id as string | undefined) ?? null;
    if (!leagueId) return marketWindow([]);
  }
  const season = await getLeagueSeason(supabase, leagueId);
  const { data } = await supabase.from("matches").select("played, round, played_at").eq("league_id", leagueId).eq("season", season);
  return marketWindow((data ?? []) as WindowMatch[]);
}

/** Temporada en curso de la liga (leagues.season). Los partidos de liga se guardan con ella. */
export async function getLeagueSeason(supabase: SupabaseClient, leagueId: string): Promise<string> {
  const { data } = await supabase.from("leagues").select("season").eq("id", leagueId).maybeSingle();
  return (data?.season as string | undefined) ?? "";
}
