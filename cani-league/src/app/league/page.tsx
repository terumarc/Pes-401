export const revalidate = 60;
import Link from "next/link";
import { DashboardBudgetChart } from "@/components/dashboard/DashboardBudgetChart";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamLogo } from "@/components/teams/TeamCard";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardStats,
  getPrimaryLeague,
} from "@/lib/data/league";
import { padPosition } from "@/lib/format/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { Store, Shield, Users, ArrowUpRight, Trophy, Sparkles } from "lucide-react";

export default async function LeaguePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <SetupNotice />
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Cani League
        </h1>
        <p className="mt-2 text-muted-foreground">Temporada 2026</p>
      </div>
    );
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return (
      <div className="space-y-6">
        <SetupNotice />
        <p className="text-muted-foreground">
          No hay liga. Ejecuta el seed SQL en Supabase.
        </p>
      </div>
    );
  }

  const stats = await getDashboardStats(league.id);

  return (
    <div className="animate-fade-up space-y-8 pb-10">
      <PageHeader
        eyebrow="Competición Oficial"
        title={league.name}
        description={`Gestión global de la Temporada ${league.season} · PES 6 / Cani Patch Manager`}
        badge={
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium gap-1.5 py-1 px-2.5"
          >
            <Sparkles className="size-3" /> Activa
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardCard
          title="Clasificación en Directo"
          href="/standings"
          cta="Ver clasificación completa"
          className="lg:col-span-2"
        >
          <ol className="divide-y divide-white/[0.06]">
            {stats.standings.map((row, index) => {
              const isTop = index === 0;
              const isChampions = index > 0 && index < 3;
              return (
                <li
                  key={row.team_id}
                  className="flex items-center gap-3.5 py-3 px-2 rounded-lg transition-colors hover:bg-white/[0.02] first:pt-1.5 last:pb-1.5"
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-md font-display text-xs font-semibold tabular-nums ${
                      isTop
                        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30 font-bold"
                        : isChampions
                        ? "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20"
                        : "bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.06]"
                    }`}
                  >
                    {padPosition(row.position)}
                  </span>
                  <TeamLogo
                    name={row.team.name}
                    logoUrl={row.team.logo_url}
                    color={row.team.primary_color}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm text-foreground/95">
                      {row.team.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.team.owner_name?.trim() || "Sin propietario"}
                    </p>
                  </div>
                  <div className="text-right">
                    <BudgetDisplay amount={row.team.budget} size="sm" />
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Presupuesto</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </DashboardCard>

        <DashboardCard title="Distribución Financiera" href="/finances" cta="Ver finanzas">
          <DashboardBudgetChart standings={stats.standings} />
        </DashboardCard>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <StatTile
            label="Mercado"
            count={stats.marketCount}
            suffix="disponibles"
            href="/market"
            cta="Explorar mercado"
            icon={<Store className="size-4 text-emerald-400" />}
          />
          <StatTile
            label="Equipos"
            count={stats.teamCount}
            suffix="clubes"
            href="/teams"
            cta="Ver clubes"
            icon={<Shield className="size-4 text-blue-400" />}
          />
          <StatTile
            label="Jugadores"
            count={stats.playerCount}
            suffix="registrados"
            href="/players"
            cta="Base de datos"
            icon={<Users className="size-4 text-amber-400" />}
          />
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  count,
  suffix,
  href,
  cta,
  icon,
}: {
  label: string;
  count: number;
  suffix: string;
  href: string;
  cta: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.18] hover:shadow-lg hover:shadow-black/25"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {label}
          </span>
          <div className="rounded-md border border-white/[0.08] bg-white/[0.03] p-1.5 transition-colors group-hover:bg-white/[0.06]">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
            {count.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">{suffix}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        <span>{cta}</span>
        <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}
