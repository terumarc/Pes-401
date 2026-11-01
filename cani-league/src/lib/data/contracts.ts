import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_RENEWAL_PERCENT,
  TIERS,
  anchorOf,
  getRenewalCost,
  getContractDuration,
  isContractExpired,
  tickContract,
  type ContractAnchor,
  type RenewalTable,
} from "@/lib/contracts";
import type { Player } from "@/types";
import type { Database } from "@/lib/supabase/database.types";

type EventInsert = Database["public"]["Tables"]["contract_events"]["Insert"];

const isSystemTeam = (name: string) => /libre|sin equipo/i.test(name);

/** % de renovación de la liga por nivel, con los valores de partida donde no haya nada guardado. */
export async function getRenewalTable(leagueId: string, client?: SupabaseClient): Promise<RenewalTable> {
  const supabase = client ?? (await createClient());
  const table: RenewalTable = { ...DEFAULT_RENEWAL_PERCENT };
  const { data, error } = await supabase.from("contract_renewals").select("tier, percent").eq("league_id", leagueId);
  if (error) return table; // sin la tabla (migración 017) se usan los valores de partida
  for (const row of data ?? []) {
    if (TIERS.includes(row.tier as keyof RenewalTable)) table[row.tier as keyof RenewalTable] = Number(row.percent);
  }
  return table;
}

/**
 * Marca una fase de la temporada como aplicada. Devuelve false si ya lo estaba,
 * para no repetirla al corregir un resultado.
 */
export async function claimSeasonStage(
  supabase: SupabaseClient,
  leagueId: string,
  calendarKey: string,
  stage: "mid" | "end" | "contracts" | "tick_winter" | "tick_summer",
): Promise<boolean> {
  const { error } = await supabase.from("season_closures").insert({ league_id: leagueId, calendar_key: calendarKey, stage });
  if (!error) return true;
  if (error.code === "23505") return false; // ya aplicada
  if (error.code === "42P01") return true; // tabla aún no creada: se comporta como antes
  if (error.code === "23514") return false; // fase nueva sin la migración 017: no se aplica
  throw error;
}

/** Identificador del calendario actual: la fecha de creación del primer partido. */
export function calendarKeyOf(matches: { created_at: string }[]): string {
  return matches.reduce((min, m) => (m.created_at < min ? m.created_at : min), matches[0]?.created_at ?? "none");
}

/**
 * Abre un mercado: los contratos que cumplen años en él bajan una temporada. Los que
 * llegan a 0 quedan acabados y se avisa a su club para que decida si los renueva.
 * No cobra nada. Se aplica una sola vez por calendario y mercado.
 */
export async function tickContracts(leagueId: string, calendarKey: string, anchor: ContractAnchor): Promise<number> {
  const supabase = await createClient();
  if (!(await claimSeasonStage(supabase, leagueId, calendarKey, anchor === "winter" ? "tick_winter" : "tick_summer"))) return 0;

  const renewals = await getRenewalTable(leagueId, supabase);
  const { data: teams } = await supabase.from("teams").select("id, name").eq("league_id", leagueId);
  const clubs = (teams ?? []).filter((t) => !isSystemTeam(t.name));
  let expired = 0;

  for (const club of clubs) {
    const { data: players } = await supabase.from("players").select("*").eq("team_id", club.id);
    const events: EventInsert[] = [];
    for (const p of (players ?? []) as Player[]) {
      if (anchorOf(p) !== anchor || isContractExpired(p)) continue;
      const left = tickContract(p);
      if (left === null) continue;
      await supabase.from("players").update({ contract_seasons_left: left }).eq("id", p.id);
      if (left === 0) {
        expired += 1;
        events.push({
          league_id: leagueId,
          calendar_key: calendarKey,
          team_id: club.id,
          player_id: p.id,
          player_name: p.name,
          team_name: club.name,
          kind: "expired",
          amount: getRenewalCost(p, renewals),
        });
      }
    }
    if (events.length) await supabase.from("contract_events").insert(events);
  }
  return expired;
}

export type ExpiredContract = {
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  teamName: string;
  cost: number;
};

/** Contratos acabados que su club aún no ha renovado. */
export async function getExpiredContracts(leagueId: string): Promise<ExpiredContract[]> {
  const supabase = await createClient();
  const renewals = await getRenewalTable(leagueId, supabase);
  const { data: teams } = await supabase.from("teams").select("id, name").eq("league_id", leagueId);
  const clubs = (teams ?? []).filter((t) => !isSystemTeam(t.name));
  if (!clubs.length) return [];
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .in("team_id", clubs.map((c) => c.id))
    .eq("contract_seasons_left", 0);
  const name = new Map(clubs.map((c) => [c.id, c.name]));
  return ((players ?? []) as Player[])
    .filter((p) => getContractDuration(p) > 0)
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      position: p.position,
      teamId: p.team_id as string,
      teamName: name.get(p.team_id as string) ?? "—",
      cost: getRenewalCost(p, renewals),
    }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName) || b.cost - a.cost);
}
