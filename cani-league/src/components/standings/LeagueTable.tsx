import Link from "next/link";
import { TeamLogo } from "@/components/teams/TeamCard";
import { FormDots } from "@/components/league/FormDots";
import type { FormResult } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { LeagueTableRow } from "@/types";

/**
 * Clasificación como la del PES: puesto, equipo y las columnas de siempre
 * (PJ, G, E, P, GF, GC, DG, Pts), calculada con los resultados de la temporada.
 * GF y GC se esconden en pantallas estrechas; la DG ya resume los dos.
 */
export function LeagueTable({ rows, forms = {} }: { rows: LeagueTableRow[]; forms?: Record<string, FormResult[]> }) {
  const num = "w-7 shrink-0 text-center tabular-nums";
  const wide = "hidden sm:block";

  return (
    <div>
      <div className="overflow-hidden rounded-[22px] bg-card">
        <div
          role="row"
          className="flex h-9 items-center gap-1 border-b border-border pl-3 pr-3 text-[12px] font-semibold uppercase text-muted-foreground"
        >
          <span className="w-6 shrink-0 text-center">#</span>
          <span className="min-w-0 flex-1 pl-8">Equipo</span>
          <span className={num} title="Partidos jugados">PJ</span>
          <span className={num} title="Ganados">G</span>
          <span className={num} title="Empatados">E</span>
          <span className={num} title="Perdidos">P</span>
          <span className={cn(num, wide)} title="Goles a favor">GF</span>
          <span className={cn(num, wide)} title="Goles en contra">GC</span>
          <span className={cn(num, "w-8")} title="Diferencia de goles">DG</span>
          <span className={cn(num, "w-9 text-foreground")} title="Puntos">Pts</span>
        </div>

        <ol>
          {rows.map((r, i) => {
            const pos = i + 1;
            const form = forms[r.team.id] ?? [];
            return (
              <li key={r.team.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/teams/${r.team.id}`}
                  className="flex min-h-[56px] items-center gap-1 pl-3 pr-3 transition-colors active:bg-white/5"
                >
                  <span
                    className={cn(
                      "w-6 shrink-0 text-center text-[15px] font-bold tabular-nums",
                      pos === 1 ? "text-[#30d158]" : pos === rows.length && rows.length > 2 ? "text-[#ff453a]" : "text-muted-foreground",
                    )}
                  >
                    {pos}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <TeamLogo name={r.team.name} logoUrl={r.team.logo_url} color={r.team.primary_color} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-tight">{r.team.short_name || r.team.name}</p>
                      <FormDots form={form} className="mt-0.5 hidden scale-90 origin-left min-[400px]:inline-flex" />
                    </div>
                  </div>
                  <span className={cn(num, "text-[15px]")}>{r.played}</span>
                  <span className={cn(num, "text-[15px]")}>{r.won}</span>
                  <span className={cn(num, "text-[15px]")}>{r.drawn}</span>
                  <span className={cn(num, "text-[15px]")}>{r.lost}</span>
                  <span className={cn(num, wide, "text-[15px]")}>{r.goals_for}</span>
                  <span className={cn(num, wide, "text-[15px]")}>{r.goals_against}</span>
                  <span className={cn(num, "w-8 text-[15px] text-muted-foreground")}>
                    {r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}
                  </span>
                  <span className={cn(num, "w-9 text-[17px] font-bold")}>{r.points}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-2 px-4 text-[13px] text-muted-foreground">
        Se ordena sola: puntos, diferencia de goles y goles a favor.
      </p>
    </div>
  );
}
