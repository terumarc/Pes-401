import Link from "next/link";
import { Wallet, Users, Store, Trophy, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/format/money";

type DashboardKpiGridProps = {
  totalBudget: number;
  averageBudget: number;
  playerCount: number;
  marketCount: number;
  teamCount: number;
  playedMatches: number;
  totalMatches: number;
};

export function DashboardKpiGrid({
  totalBudget,
  averageBudget,
  playerCount,
  marketCount,
  teamCount,
  playedMatches,
  totalMatches,
}: DashboardKpiGridProps) {
  const matchProgressPct =
    totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0;

  const kpis = [
    {
      label: "Masa Salarial Total",
      value: formatMoney(totalBudget),
      subtext: `Media de ${formatMoney(averageBudget)} por club`,
      href: "/finances",
      cta: "Ver finanzas",
      icon: <Wallet className="size-4 text-emerald-400" />,
      accentColor: "from-emerald-500/20 to-transparent",
    },
    {
      label: "Jugadores Registrados",
      value: playerCount.toLocaleString(),
      subtext: `Distribuidos en ${teamCount} clubes oficiales`,
      href: "/players",
      cta: "Base de datos",
      icon: <Users className="size-4 text-blue-400" />,
      accentColor: "from-blue-500/20 to-transparent",
    },
    {
      label: "Mercado Activo",
      value: marketCount.toLocaleString(),
      subtext: "Futbolistas transferibles o libres",
      href: "/market",
      cta: "Ir al mercado",
      icon: <Store className="size-4 text-amber-400" />,
      accentColor: "from-amber-500/20 to-transparent",
    },
    {
      label: "Progreso de Temporada",
      value: totalMatches > 0 ? `${matchProgressPct}%` : "Lista",
      subtext:
        totalMatches > 0
          ? `${playedMatches} de ${totalMatches} partidos jugados`
          : "Calendario preparado",
      href: "/calendar",
      cta: "Ver calendario",
      icon: <Trophy className="size-4 text-purple-400" />,
      accentColor: "from-purple-500/20 to-transparent",
    },
  ];

  return (
    <section aria-label="Métricas clave de la liga" className="w-full">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 p-4.5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.18] hover:bg-card/85 hover:shadow-lg hover:shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {/* Stripe subtle top hairline gradient */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {kpi.label}
                </span>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 transition-colors group-hover:bg-white/[0.07]">
                  {kpi.icon}
                </div>
              </div>

              <div className="mt-3">
                <p className="font-display text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80 leading-snug">
                  {kpi.subtext}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              <span>{kpi.cta}</span>
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
