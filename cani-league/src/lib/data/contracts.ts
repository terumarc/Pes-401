import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SALARY_PERCENT,
  TIERS,
  closeSeasonForPlayer,
  getPlayerSalary,
  salaryShareFor,
  winterStartOf,
  type SalaryTable,
} from "@/lib/contracts";
import type { Player } from "@/types";
import type { Database } from "@/lib/supabase/database.types";

type EventInsert = Database["public"]["Tables"]["contract_events"]["Insert"];

const isSystemTeam = (name: string) => /libre|sin equipo/i.test(name);

/** Sueldos de la liga (% por nivel), con los valores de partida donde no haya nada guardado. */
export async function getSalaryTable(leagueId: string, client?: SupabaseClient): Promise<SalaryTable> {
  const supabase = client ?? (await createClient());
  const table: SalaryTable = { ...DEFAULT_SALARY_PERCENT };
  const { data, error } = await supabase.from("contract_salaries").select("tier, percent").eq("league_id", leagueId);
  if (error) return table; // sin la tabla (migración 005) se usan los valores de partida
  for (const row of data ?? []) {
    if (TIERS.includes(row.tier as keyof SalaryTable)) table[row.tier as keyof SalaryTable] = Number(row.percent);
  }
  return table;
}

/**
 * Marca una fase de la temporada como aplicada. Devuelve false si ya lo estaba,
 * para no cobrar ni pagar dos veces al corregir un resultado.
 */
export async function claimSeasonStage(
  supabase: SupabaseClient,
  leagueId: string,
  calendarKey: string,
  stage: "mid" | "end" | "contracts",
): Promise<boolean> {
  const { error } = await supabase.from("season_closures").insert({ league_id: leagueId, calendar_key: calendarKey, stage });
  if (!error) return true;
  if (error.code === "23505") return false; // ya aplicada
  if (error.code === "42P01") return true; // tabla aún no creada: se comporta como antes
  throw error;
}

/** Identificador del calendario actual: la fecha de creación del primer partido. */
export function calendarKeyOf(matches: { created_at: string }[]): string {
  return matches.reduce((min, m) => (m.created_at < min ? m.created_at : min), matches[0]?.created_at ?? "none");
}

export type ContractClosureSummary = {
  teamId: string;
  teamName: string;
  paid: number;
  released: string[];
};

/**
 * Cierre de contratos al acabar la temporada: cobra los sueldos, descuenta un año a cada
 * contrato, cobra las renovaciones que vencen y deja libres a los jugadores que el club no
 * puede pagar. Se aplica una sola vez por calendario.
 */
export async function closeSeasonContracts(leagueId: string, calendarKey: string): Promise<ContractClosureSummary[] | null> {
  const supabase = await createClient();
  if (!(await claimSeasonStage(supabase, leagueId, calendarKey, "contracts"))) return null;

  const salaries = await getSalaryTable(leagueId, supabase);
  const { data: teams, error: teamsErr } = await supabase.from("teams").select("id, name, budget").eq("league_id", leagueId);
  if (teamsErr || !teams) throw teamsErr ?? new Error("No se encontraron los equipos de la liga");

  // El equipo de agentes libres puede no estar asociado a la liga: se busca en todas.
  let freeAgents = teams.find((t) => isSystemTeam(t.name));
  if (!freeAgents) {
    const { data } = await supabase
      .from("teams")
      .select("id, name, budget")
      .or("name.ilike.%libre%,name.ilike.%sin equipo%")
      .limit(1)
      .maybeSingle();
    freeAgents = data ?? undefined;
  }
  const clubs = teams.filter((t) => !isSystemTeam(t.name));

  // Fichajes de invierno: quien llegó al club después de acabar la ida paga media temporada.
  const { data: firstRound } = await supabase
    .from("matches")
    .select("round, played, played_at")
    .eq("league_id", leagueId)
    .eq("round", 1)
    .gte("created_at", calendarKey);
  const winterStart = winterStartOf(firstRound ?? []);
  const salaryShareOf = (p: Player) => salaryShareFor(p.joined_team_at, winterStart);
  const summary: ContractClosureSummary[] = [];

  for (const club of clubs) {
    const { data: players, error } = await supabase.from("players").select("*").eq("team_id", club.id);
    if (error) throw error;

    // Primero los sueldos más altos: si falta dinero, se van las estrellas que no se pueden pagar.
    const squad = ((players ?? []) as Player[]).sort((a, b) => getPlayerSalary(b, salaries) - getPlayerSalary(a, salaries));
    let budget = club.budget ?? 0;
    const events: EventInsert[] = [];
    const released: string[] = [];

    for (const p of squad) {
      const result = closeSeasonForPlayer(p, budget, salaries, salaryShareOf(p));
      budget = result.budget;
      for (const step of result.steps) {
        events.push({
          league_id: leagueId,
          calendar_key: calendarKey,
          team_id: club.id,
          player_id: p.id,
          player_name: p.name,
          team_name: club.name,
          kind: step.kind,
          amount: step.amount,
        });
      }
      if (result.released) {
        released.push(p.name);
        await supabase
          .from("players")
          .update(
            freeAgents
              ? { team_id: freeAgents.id, available_in_market: true, contract_seasons_left: null }
              : { available_in_market: true, contract_seasons_left: null },
          )
          .eq("id", p.id);
      } else if (result.seasonsLeft !== (p.contract_seasons_left ?? null)) {
        await supabase.from("players").update({ contract_seasons_left: result.seasonsLeft }).eq("id", p.id);
      }
    }

    await supabase.from("teams").update({ budget }).eq("id", club.id);
    if (events.length) await supabase.from("contract_events").insert(events);
    summary.push({ teamId: club.id, teamName: club.name, paid: (club.budget ?? 0) - budget, released });
  }

  return summary;
}

export type ContractEvent = {
  id: string;
  team_name: string;
  player_name: string;
  kind: "salary" | "renewal" | "released";
  amount: number;
  created_at: string;
};

/** Cobros del último cierre de temporada. */
export async function getLastContractEvents(leagueId: string): Promise<ContractEvent[]> {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("contract_events")
    .select("calendar_key")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return [];
  const { data } = await supabase
    .from("contract_events")
    .select("id, team_name, player_name, kind, amount, created_at")
    .eq("league_id", leagueId)
    .eq("calendar_key", last.calendar_key)
    .order("amount", { ascending: false });
  return (data ?? []) as ContractEvent[];
}
