import Link from "next/link";
import { TeamLogo } from "@/components/teams/TeamCard";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Button } from "@/components/ui/button";
import { padPosition } from "@/lib/format/stats";
import { Trophy, Medal, ArrowUpRight, Crown } from "lucide-react";
import type { StandingWithTeam } from "@/types";

type DashboardStandingsPodiumProps = {
  standings: StandingWithTeam[];
};

export function DashboardStandingsPodium({
  standings,
}: DashboardStandingsPodiumProps) {
  const top3 = standings.slice(0, 3);
  const remaining = standings.slice(3);

  const podiumConfig = [
    {
      place: 1,
      badge: "Líder",
      ringColor: "ring-amber-400/40 border-amber-400/30 bg-amber-500/10",
      accentText: "text-amber-300",
      glow: "shadow-[0_0_24px_rgba(251,191,36,0.15)]",
      icon: <Crown className="size-4 text-amber-300" />,
    },
    {
      place: 2,
      badge: "2º Puesto",
      ringColor: "ring-slate-300/30 border-slate-300/30 bg-slate-300/10",
      accentText: "text-slate-200",
      glow: "shadow-none",
      icon: <Medal className="size-4 text-slate-300" />,
    },
    {
      place: 3,
      badge: "3º Puesto",
      ringColor: "ring-amber-600/30 border-amber-600/30 bg-amber-600/10",
      accentText: "text-amber-400",
      glow: "shadow-none",
      icon: <Medal className="size-4 text-amber-500" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top 3 Visual Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {top3.map((row, idx) => {
            const conf = podiumConfig[idx] || podiumConfig[0];
            return (
              <div
                key={row.team_id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/90 ${conf.ringColor} ${conf.glow}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${conf.accentText}`}>
                    {conf.icon} {conf.badge}
                  </span>
                  <span className="font-display text-xs font-semibold tabular-nums text-muted-foreground">
                    #{padPosition(row.position)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <TeamLogo
                    name={row.team.name}
                    logoUrl={row.team.logo_url}
                    color={row.team.primary_color}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold text-foreground">
                      {row.team.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.team.owner_name?.trim() || "Sin propietario"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2 text-xs">
                  <span className="text-[11px] text-muted-foreground">Presupuesto</span>
                  <BudgetDisplay amount={row.team.budget} size="sm" className="font-semibold" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Remaining Teams in Compact Clean List */}
      {remaining.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-card/40 p-1 backdrop-blur-sm overflow-hidden">
          <ol className="divide-y divide-white/[0.05]">
            {remaining.map((row) => (
              <li
                key={row.team_id}
                className="flex items-center gap-3 py-2.5 px-3 transition-colors hover:bg-white/[0.03] rounded-lg"
              >
                <span className="flex size-6 items-center justify-center rounded-md bg-white/[0.04] font-display text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-white/[0.06]">
                  {padPosition(row.position)}
                </span>
                <TeamLogo
                  name={row.team.name}
                  logoUrl={row.team.logo_url}
                  color={row.team.primary_color}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs sm:text-sm font-medium text-foreground">
                    {row.team.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {row.team.owner_name?.trim() || "Sin propietario"}
                  </p>
                </div>
                <div className="text-right">
                  <BudgetDisplay amount={row.team.budget} size="sm" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
