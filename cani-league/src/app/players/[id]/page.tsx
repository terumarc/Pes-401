export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { PlayerActions } from "@/components/players/PlayerActions";
import { PlayerForm } from "@/components/players/PlayerForm";
import { PlayerStats } from "@/components/players/PlayerStats";
import { getLeagueSquads, getPlayerById, getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { getOffers } from "@/lib/data/market";
import { getMarketWindow } from "@/lib/data/season";
import { OfferSheet } from "@/components/market/OfferSheet";
import { OfferList, type OfferView } from "@/components/market/OfferList";
import { formatDay } from "@/components/market/MarketSections";
import { formatMoney } from "@/lib/format/money";
import { getPlayerTier, getPlayerEffectiveRating, getPlayerContractInfo } from "@/lib/players";
import { getPlayerSalary, getSeasonsLeft, DEFAULT_SALARY_PERCENT, salaryShareFor, winterStartOf } from "@/lib/contracts";
import { getMatchesByLeague } from "@/lib/data/matches";
import { getSalaryTable } from "@/lib/data/contracts";
import { getGoals } from "@/lib/data/stats";
import { createStaticClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

function short(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  return formatMoney(value);
}

export default async function PlayerDetailPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) return <p className="text-muted-foreground">Configura Supabase primero.</p>;

  const { id } = await params;
  const { edit } = await searchParams;
  const player = await getPlayerById(id);
  if (!player) notFound();

  const league = await getPrimaryLeague();
  const [teams, salaries, allGoals, matches] = league
    ? await Promise.all([
        getTeamsByLeague(league.id),
        getSalaryTable(league.id),
        getGoals(league.id),
        getMatchesByLeague(league.id).catch(() => []),
      ])
    : [[], DEFAULT_SALARY_PERCENT, [], []];
  // Fichaje de invierno: esta temporada paga la mitad del sueldo.
  const winterSigning = salaryShareFor(player.joined_team_at, winterStartOf(matches)) < 1;
  const freeAgentEarly = !player.team || /libre|sin equipo/i.test(player.team.name);
  const [offers, window, everyone] =
    league && !freeAgentEarly
      ? await Promise.all([getOffers(league.id, { playerId: player.id, resolvedLimit: 5 }), getMarketWindow(createStaticClient(), league.id), getLeagueSquads(league.id)])
      : [[], null, []];
  const myGoals = allGoals.filter((g) => g.player_id === player.id);
  const seasonGoals = myGoals.filter((g) => league && g.season === league.season).reduce((n, g) => n + g.goals, 0);
  const careerGoals = myGoals.reduce((n, g) => n + g.goals, 0);
  const tier = getPlayerTier(player);
  const rating = getPlayerEffectiveRating(player);
  const contract = getPlayerContractInfo(player);
  const team = player.team;
  const freeAgent = !team || /libre|sin equipo/i.test(team.name);

  if (edit === "1" && (await getViewer())?.isAdmin) {
    return (
      <div className="animate-fade-up mx-auto max-w-2xl pb-12">
        <h1 className="mb-5 text-[length:min(2rem,51px)] font-bold tracking-tight">Editar jugador</h1>
        <div className="rounded-[22px] bg-card p-5">
          <PlayerForm teams={teams} player={player} />
        </div>
        <Link href={`/players/${player.id}`} className="mt-4 inline-flex h-11 items-center text-[length:min(1rem,25.5px)] text-[#0a84ff]">
          Cancelar
        </Link>
      </div>
    );
  }

  const clubs = teams.filter((t) => !/libre|sin equipo/i.test(t.name));
  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? "—";
  const offerViews: OfferView[] = offers.map((o) => ({
    id: o.id,
    status: o.status,
    playerId: o.player_id,
    playerName: player.name,
    buyerId: o.buyer_team_id,
    sellerId: o.seller_team_id,
    buyerName: teamName(o.buyer_team_id),
    sellerName: teamName(o.seller_team_id),
    amount: o.amount,
    swapName: o.swap_player_id ? everyone.find((p) => p.id === o.swap_player_id)?.name ?? "Jugador" : null,
    date: formatDay(o.resolved_at ?? o.created_at),
  }));

  const facts: [string, React.ReactNode][] = [
    ["Precio", formatMoney(contract.price)],
    [
      "Contrato",
      freeAgent || contract.duration === 0
        ? "Sin contrato"
        : `${getSeasonsLeft(player)} de ${contract.duration} ${contract.duration === 1 ? "temporada" : "temporadas"}`,
    ],
    [
      "Sueldo",
      getPlayerSalary(player, salaries) > 0
        ? `${formatMoney(getPlayerSalary(player, salaries))} por temporada${
            winterSigning ? ` · esta, ${formatMoney(Math.round(getPlayerSalary(player, salaries) / 2))} (fichaje de invierno)` : ""
          }`
        : "Sin sueldo",
    ],
    ["Renovación", contract.renewalCost > 0 ? `${contract.renewalPercentLabel} · ${formatMoney(contract.renewalCost)}` : "Gratis"],
    ["Goles", careerGoals ? `${seasonGoals} esta temporada · ${careerGoals} en total` : "Ninguno todavía"],
    ["En el mercado", player.available_in_market ? "Sí" : "No"],
  ];

  return (
    <div className="animate-fade-up pb-12">
      {/* Cabecera: color del club fundido con el fondo, avatar pixel art y cifras clave. */}
      <header className="relative -mx-4 -mt-2 mb-6 px-4 pb-2 pt-6 md:mx-0 md:mt-0 md:rounded-[22px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 md:rounded-[22px]"
          style={{ background: `linear-gradient(180deg, ${freeAgent ? "#3a3a3c" : team.primary_color}66 0%, transparent 85%)` }}
        />
        <div className="relative flex flex-col items-center text-center">
          <span className="flex size-24 items-end justify-center overflow-hidden rounded-full bg-[#2c2c2e]">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo_url} alt="" className="size-full object-cover" />
            ) : (
              <PixelAvatar
                seed={player.id}
                shirt={freeAgent ? "#5d6675" : team.primary_color}
                trim={freeAgent ? undefined : team.secondary_color}
                className="size-full translate-y-[12%] scale-110"
              />
            )}
          </span>
          <h1 className="mt-3 text-[length:min(1.6471rem,42px)] font-bold leading-tight tracking-tight">{player.name}</h1>
          <p className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
            {[player.position, player.age ? `${player.age} años` : null, player.nationality].filter(Boolean).join(" · ")}
          </p>

          <dl className="mt-5 grid w-full max-w-md grid-cols-3 rounded-[22px] bg-card py-3">
            {[
              { label: "Media", value: rating || "–" },
              { label: "Nivel", value: tier.tier },
              { label: "Precio", value: short(contract.price) },
            ].map((s, i) => (
              <div key={s.label} className={i > 0 ? "border-l border-border" : undefined}>
                <dt className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{s.label}</dt>
                <dd className="text-[length:min(1.1765rem,30px)] font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="pl-club">
            <h2 id="pl-club" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
              Ficha
            </h2>
            <ul className="overflow-hidden rounded-[22px] bg-card">
              <li className="border-b border-border">
                {freeAgent ? (
                  <div className="flex min-h-11 items-center justify-between px-4 py-3 text-[length:min(1rem,25.5px)]">
                    <span>Club</span>
                    <span className="text-muted-foreground">Agente libre</span>
                  </div>
                ) : (
                  <Link href={`/teams/${team.id}`} className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-[length:min(1rem,25.5px)] active:bg-white/[0.06]">
                    <span>Club</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {team.name}
                      <ChevronRight className="size-4 text-[#5a5a5f]" aria-hidden />
                    </span>
                  </Link>
                )}
              </li>
              {facts.map(([k, v], i) => (
                <li
                  key={k}
                  className={`flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-[length:min(1rem,25.5px)] large-text:flex-col large-text:items-start large-text:gap-0.5 ${i < facts.length - 1 ? "border-b border-border" : ""}`}
                >
                  <span>{k}</span>
                  <span className="text-right tabular-nums text-muted-foreground large-text:text-left">{v}</span>
                </li>
              ))}
            </ul>
          </section>

          {!freeAgent && edit !== "1" && (
            <section aria-labelledby="pl-offers">
              <h2 id="pl-offers" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
                Ofertas
              </h2>
              <div className="space-y-4">
                <OfferSheet
                  player={{ id: player.id, name: player.name, team_id: player.team_id, teamName: team.name }}
                  clubs={clubs.map((c) => ({ id: c.id, name: c.name, budget: c.budget }))}
                  squads={everyone.flatMap((p) => (p.team_id && p.team_id !== player.team_id ? [{ id: p.id, name: p.name, position: p.position, team_id: p.team_id }] : []))}
                  suggested={contract.price}
                />
                {offerViews.length > 0 && <OfferList offers={offerViews} marketOpen={window?.open ?? false} hidePlayer />}
              </div>
            </section>
          )}

          <section aria-label="Acciones">
            <PlayerActions
              playerId={player.id}
              availableInMarket={player.available_in_market}
              teams={teams}
              currentTeamId={player.team_id}
              player={player}
              variant="default"
            />
          </section>
        </div>

        <section aria-labelledby="pl-stats">
          <h2 id="pl-stats" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
            Atributos
          </h2>
          <div className="rounded-[22px] bg-card p-4">
            <PlayerStats player={player} />
          </div>
        </section>
      </div>
    </div>
  );
}
