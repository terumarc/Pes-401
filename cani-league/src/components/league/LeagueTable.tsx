import type { LeagueTableRow } from "@/types";
import { TeamLogo } from "@/components/teams/TeamCard";
import { padPosition } from "@/lib/format/stats";
import { Crown, Trophy, Award } from "lucide-react";

type LeagueTableProps = {
  rows: LeagueTableRow[];
};

export function LeagueTable({ rows }: LeagueTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md shadow-lg shadow-black/20">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="w-12 py-3.5 pl-4 text-left">#</th>
            <th className="py-3.5 pl-2 text-left">Club</th>
            <th className="px-3 py-3.5 text-center" title="Partidos Jugados">PJ</th>
            <th className="px-3 py-3.5 text-center text-emerald-400" title="Victorias">G</th>
            <th className="px-3 py-3.5 text-center text-muted-foreground" title="Empates">E</th>
            <th className="px-3 py-3.5 text-center text-rose-400" title="Derrotas">P</th>
            <th className="px-3 py-3.5 text-center hidden sm:table-cell" title="Goles a Favor">GF</th>
            <th className="px-3 py-3.5 text-center hidden sm:table-cell" title="Goles en Contra">GC</th>
            <th className="px-3 py-3.5 text-center" title="Diferencia de Goles">DIF</th>
            <th className="px-4 py-3.5 text-center font-extrabold text-foreground" title="Puntos Totales">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((row, idx) => {
            const position = idx + 1;
            const isLeader = position === 1;
            const isEurope = position === 2 || position === 3;

            return (
              <tr
                key={row.team.id}
                className="group transition-colors hover:bg-white/[0.03]"
              >
                <td className="py-3 pl-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex size-6 items-center justify-center rounded-md font-display text-xs font-bold tabular-nums ${
                        isLeader
                          ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                          : isEurope
                          ? "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20"
                          : "bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.06]"
                      }`}
                    >
                      {padPosition(position)}
                    </span>
                    {isLeader && <Crown className="size-3 text-amber-400 hidden sm:inline" />}
                  </div>
                </td>
                <td className="py-3 pl-2">
                  <div className="flex items-center gap-2.5">
                    <TeamLogo
                      name={row.team.name}
                      logoUrl={row.team.logo_url}
                      color={row.team.primary_color}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors block truncate max-w-[150px] sm:max-w-none">
                        {row.team.name}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-muted-foreground font-medium">
                  {row.played}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-emerald-400 font-semibold">
                  {row.won}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-muted-foreground font-medium">
                  {row.drawn}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-rose-400 font-semibold">
                  {row.lost}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-foreground/80 hidden sm:table-cell">
                  {row.goals_for}
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-muted-foreground hidden sm:table-cell">
                  {row.goals_against}
                </td>
                <td className="px-3 py-3 text-center tabular-nums font-semibold">
                  <span
                    className={
                      row.goal_diff > 0
                        ? "text-emerald-400"
                        : row.goal_diff < 0
                        ? "text-rose-400"
                        : "text-muted-foreground"
                    }
                  >
                    {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-display text-base font-extrabold tabular-nums text-foreground">
                    {row.points}
                  </span>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                Aún no hay partidos jugados en esta temporada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
