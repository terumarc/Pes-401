export const dynamic = "force-dynamic";
import Link from "next/link";
import { DashboardBudgetChart } from "@/components/dashboard/DashboardBudgetChart";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { TeamLogo } from "@/components/teams/TeamCard";
import {
  getDashboardStats,
  getPrimaryLeague,
} from "@/lib/data/league";
import { padPosition } from "@/lib/format/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function LeaguePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <SetupNotice />
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Cani League
        </h1>
        <p className="mt-2 text-ink-muted">Temporada 2026</p>
      </div>
    );
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return (
      <div>
        <SetupNotice />
        <p className="text-ink-muted">
          No hay liga. Ejecuta el seed SQL en Supabase.
        </p>
      </div>
    );
  }

  const stats = await getDashboardStats(league.id);

  return (
    <div className="animate-fade-up">
      <header className="mb-10">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
          Liga
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {league.name}
        </h1>
        <p className="mt-2 text-ink-muted">Temporada {league.season}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardCard
          title="Clasificación"
          href="/standings"
          cta="Ver clasificación"
          className="lg:col-span-2"
        >
          <ol className="divide-y divide-line">
            {stats.standings.map((row) => (
              <li
                key={row.team_id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="w-8 font-display text-lg font-semibold tabular-nums text-ink-subtle">
                  {padPosition(row.position)}
                </span>
                <TeamLogo
                  name={row.team.name}
                  logoUrl={row.team.logo_url}
                  color={row.team.primary_color}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.team.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {row.team.owner_name?.trim() || "Sin propietario"}
                  </p>
                </div>
                <BudgetDisplay amount={row.team.budget} size="sm" />
              </li>
            ))}
          </ol>
        </DashboardCard>

        <DashboardCard title="Dinero" href="/finances" cta="Ver finanzas">
          <DashboardBudgetChart standings={stats.standings} />
        </DashboardCard>

        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <StatTile
            label="Mercado"
            value={`${stats.marketCount} jugadores disponibles`}
            href="/market"
            cta="Ver mercado"
          />
          <StatTile
            label="Equipos"
            value={`${stats.teamCount} equipos`}
            href="/teams"
            cta="Ver equipos"
          />
          <StatTile
            label="Jugadores"
            value={`${stats.playerCount} jugadores`}
            href="/players"
            cta="Ver jugadores"
          />
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  href,
  cta,
}: {
  label: string;
  value: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-bg-elevated p-5 shadow-[var(--shadow-soft)]">
      <p className="text-[11px] tracking-wide text-ink-subtle uppercase">
        {label}
      </p>
      <p className="mt-3 font-display text-xl font-semibold tracking-tight">
        {value}
      </p>
      <Link
        href={href}
        className="mt-4 inline-block text-xs font-medium tracking-wide text-accent uppercase"
      >
        {cta}
      </Link>
    </div>
  );
}
