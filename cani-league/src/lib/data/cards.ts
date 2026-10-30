import { createClient } from "@/lib/supabase/server";
import { toCardTransfers, type CardDraw, type Deck, type Faction, type Rarity } from "@/lib/cards";
import type { Database } from "@/lib/supabase/database.types";

type DrawRow = Database["public"]["Tables"]["card_draws"]["Row"];

/** Añade el nombre del club y el partido («tras el A 1-3 B») a cada carta. */
async function hydrate(rows: DrawRow[]): Promise<CardDraw[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const matchIds = [...new Set(rows.map((r) => r.match_id).filter((x): x is string => !!x))];
  const { data: matches } = matchIds.length
    ? await supabase.from("matches").select("id, home_team_id, away_team_id, home_goals, away_goals").in("id", matchIds)
    : { data: [] as { id: string; home_team_id: string; away_team_id: string; home_goals: number | null; away_goals: number | null }[] };

  const teamIds = new Set(rows.map((r) => r.team_id));
  for (const m of matches ?? []) {
    teamIds.add(m.home_team_id);
    teamIds.add(m.away_team_id);
  }
  const { data: teams } = await supabase.from("teams").select("id, name").in("id", [...teamIds]);
  const name = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const match = new Map((matches ?? []).map((m) => [m.id, m]));

  return rows.map((r) => {
    const m = r.match_id ? match.get(r.match_id) : undefined;
    return {
      id: r.id,
      createdAt: r.created_at,
      teamId: r.team_id,
      teamName: name.get(r.team_id) ?? "—",
      deck: r.deck as Deck,
      rarity: r.rarity as Rarity,
      faction: (r.faction as Faction | null) ?? null,
      icon: r.icon,
      text: r.text,
      amount: Number(r.amount),
      transfers: toCardTransfers(r.transfers),
      status: r.status as CardDraw["status"],
      matchLabel: m
        ? `tras el ${name.get(m.home_team_id) ?? "—"} ${m.home_goals ?? 0}-${m.away_goals ?? 0} ${name.get(m.away_team_id) ?? "—"}`
        : null,
    };
  });
}

/** La carta que tiene el club boca abajo, si tiene. */
export async function getPendingCard(teamId: string): Promise<CardDraw | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_draws")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  return (await hydrate(data))[0] ?? null;
}

/** Noticias de la liga: las cartas ya giradas, las más nuevas primero. */
export async function getLeagueCards(leagueId: string, limit = 60): Promise<CardDraw[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_draws")
    .select("*")
    .eq("league_id", leagueId)
    .eq("status", "revealed")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return hydrate(data);
}

/** Cartas de un club en una temporada (las boca abajo se cuentan pero no se enseñan). */
export async function getTeamCards(teamId: string, season: string | null): Promise<{ cards: CardDraw[]; pending: number }> {
  const supabase = await createClient();
  let q = supabase.from("card_draws").select("*").eq("team_id", teamId).order("created_at", { ascending: false });
  if (season) q = q.eq("season", season);
  const { data, error } = await q;
  if (error || !data) return { cards: [], pending: 0 };
  const pending = data.filter((d) => d.status === "pending").length;
  return { cards: await hydrate(data.filter((d) => d.status === "revealed")), pending };
}
