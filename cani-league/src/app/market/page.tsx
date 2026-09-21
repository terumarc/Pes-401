export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { MarketSearchList } from "@/components/market/MarketSearchList";
import {
  getPlayers,
  getPrimaryLeague,
  getTeamsByLeague,
} from "@/lib/data/league";
import { getPlayerFixedPrice } from "@/lib/players";
import { formatMoney } from "@/lib/format/money";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { Store, UserCheck, ShieldAlert, Coins } from "lucide-react";

export default async function MarketPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-muted-foreground">No hay liga configurada.</p>;
  }

  const [players, teams] = await Promise.all([
    getPlayers(),
    getTeamsByLeague(league.id),
  ]);

  // Equipos compradores elegibles (equipos reales de la liga)
  const buyerTeams = teams.filter(
    (t) =>
      !t.name.toLowerCase().includes("libre") &&
      !t.name.toLowerCase().includes("sin equipo")
  );

  // Estadísticas del Mercado
  const freeAgentsCount = players.filter(
    (p) =>
      !p.team_id ||
      p.team?.name?.toLowerCase().includes("libre") ||
      p.team?.name?.toLowerCase().includes("sin equipo")
  ).length;

  const clausePlayersCount = players.length - freeAgentsCount;

  const totalValue = players.reduce((acc, p) => acc + getPlayerFixedPrice(p), 0);
  const avgValue = players.length > 0 ? Math.round(totalValue / players.length) : 0;

  return (
    <div className="animate-fade-up space-y-6 pb-12">
      <PageHeader
        eyebrow="Transferencias y Fichajes Oficiales"
        title="Mercado de Jugadores"
        description="Gestión de cláusulas de rescisión directas a otros clubes e incorporación inmediata de agentes libres."
      />

      {/* Resumen Ejecutivo del Mercado */}
      <section
        aria-label="Resumen ejecutivo del mercado"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-4 backdrop-blur-md shadow-xs">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Store className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Mercado</span>
          </div>
          <p className="font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {players.length.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted-foreground">Futbolistas registrados</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-4 backdrop-blur-md shadow-xs">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <UserCheck className="size-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Agentes Libres</span>
          </div>
          <p className="font-display text-2xl font-bold tracking-tight text-emerald-400 tabular-nums">
            {freeAgentsCount.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted-foreground">Fichaje directo sin club</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-4 backdrop-blur-md shadow-xs">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <ShieldAlert className="size-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Con Cláusula</span>
          </div>
          <p className="font-display text-2xl font-bold tracking-tight text-amber-300 tabular-nums">
            {clausePlayersCount.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted-foreground">Pertenecientes a clubes</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-4 backdrop-blur-md shadow-xs">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Coins className="size-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Precio Medio</span>
          </div>
          <p className="font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(avgValue)}
          </p>
          <span className="text-[11px] text-muted-foreground">Valor medio por jugador</span>
        </div>
      </section>

      <MarketSearchList players={players} teams={buyerTeams} />
    </div>
  );
}
