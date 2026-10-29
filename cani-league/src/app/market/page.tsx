export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { SegmentedNav } from "@/components/layout/SegmentedNav";
import { PlayerBrowser } from "@/components/players/PlayerBrowser";
import { MarketBanner, TransferHistory, formatDay } from "@/components/market/MarketSections";
import { OfferList, type OfferView } from "@/components/market/OfferList";
import { getPlayerNames, getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { searchPlayers } from "@/lib/data/player-search";
import { getOffers, getTransfers } from "@/lib/data/market";
import { getMarketWindow } from "@/lib/data/season";
import { createStaticClient, isSupabaseConfigured } from "@/lib/supabase/server";

const SECTIONS = [
  { href: "/market", label: "Jugadores" },
  { href: "/market?s=ofertas", label: "Ofertas" },
  { href: "/market?s=fichajes", label: "Fichajes" },
];

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-muted-foreground">No hay liga configurada.</p>;
  }

  const { s } = await searchParams;
  const section = s === "ofertas" || s === "fichajes" ? s : "jugadores";
  const current = section === "jugadores" ? "/market" : `/market?s=${section}`;

  const [initial, teams, window, offers, transfers] = await Promise.all([
    section === "jugadores" ? searchPlayers({}) : Promise.resolve({ rows: [], total: 0 }),
    getTeamsByLeague(league.id),
    getMarketWindow(createStaticClient(), league.id),
    section === "ofertas" ? getOffers(league.id, { resolvedLimit: 15 }) : Promise.resolve([]),
    section === "fichajes" ? getTransfers(league.id) : Promise.resolve([]),
  ]);

  // Equipos compradores elegibles (equipos reales de la liga)
  const buyerTeams = teams.filter(
    (t) =>
      !t.name.toLowerCase().includes("libre") &&
      !t.name.toLowerCase().includes("sin equipo")
  );

  const pendingCount = section === "ofertas" ? offers.filter((o) => o.status === "pending").length : 0;
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  // Solo los nombres de los jugadores que salen en las ofertas, no la lista entera.
  const names = await getPlayerNames(offers.flatMap((o) => [o.player_id, o.swap_player_id]).filter((x): x is string => !!x));
  const playerName = (id: string | null) => (id ? names[id] ?? "Jugador" : null);
  const offerViews: OfferView[] = offers.map((o) => ({
    id: o.id,
    status: o.status,
    playerId: o.player_id,
    playerName: playerName(o.player_id) ?? "Jugador",
    buyerId: o.buyer_team_id,
    sellerId: o.seller_team_id,
    buyerName: teamName(o.buyer_team_id),
    sellerName: teamName(o.seller_team_id),
    amount: o.amount,
    swapName: playerName(o.swap_player_id),
    date: formatDay(o.resolved_at ?? o.created_at),
  }));

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Mercado" />
      <SegmentedNav
        items={SECTIONS.map((x) => (x.label === "Ofertas" && pendingCount ? { ...x, label: `Ofertas (${pendingCount})` } : x))}
        current={current}
        label="Secciones del mercado"
      />
      <MarketBanner window={window} />
      {section === "jugadores" && <PlayerBrowser mode="market" initial={initial} teams={buyerTeams} marketOpen={window.open} />}
      {section === "ofertas" && <OfferList offers={offerViews} marketOpen={window.open} />}
      {section === "fichajes" && <TransferHistory transfers={transfers} />}
    </div>
  );
}
