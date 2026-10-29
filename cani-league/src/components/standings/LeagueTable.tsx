import Link from "next/link";
import { TeamLogo } from "@/components/teams/TeamCard";
import { FormDots } from "@/components/league/FormDots";
import type { FormResult } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { LeagueTableRow } from "@/types";

const COLUMNS = [
  { short: "PJ", long: "Partidos jugados", key: "played" },
  { short: "G", long: "Ganados", key: "won" },
  { short: "E", long: "Empatados", key: "drawn" },
  { short: "P", long: "Perdidos", key: "lost" },
  { short: "GF", long: "Goles a favor", key: "goals_for", wide: true },
  { short: "GC", long: "Goles en contra", key: "goals_against", wide: true },
] as const;

/**
 * Clasificación como la del PES: puesto, equipo y las columnas de siempre
 * (PJ, G, E, P, GF, GC, DG, Pts), calculada con los resultados de la temporada.
 * GF y GC se esconden en pantallas estrechas; la DG ya resume los dos.
 * Lleva los roles de tabla para que VoiceOver la lea por filas y columnas.
 */
export function LeagueTable({ rows, forms = {} }: { rows: LeagueTableRow[]; forms?: Record<string, FormResult[]> }) {
  const num = "w-7 shrink-0 text-center tabular-nums";
  const wide = "hidden sm:block";
  const header = (short: string, long: string, className?: string) => (
    <span key={short} role="columnheader" className={cn(num, className)}>
      <span aria-hidden>{short}</span>
      <span className="sr-only">{long}</span>
    </span>
  );

  return (
    <div>
      <div role="table" aria-label="Clasificación de la liga" className="overflow-hidden rounded-[22px] bg-card">
        <div role="rowgroup">
          <div
            role="row"
            className="flex h-9 items-center gap-1 border-b border-border pl-3 pr-3 text-[length:min(0.7059rem,18px)] font-semibold uppercase text-muted-foreground"
          >
            {header("#", "Puesto", "w-6")}
            <span role="columnheader" className="min-w-0 flex-1 pl-8">Equipo</span>
            {COLUMNS.map((c) => header(c.short, c.long, "wide" in c ? wide : undefined))}
            {header("DG", "Diferencia de goles", "w-8")}
            {header("Pts", "Puntos", "w-9 text-foreground")}
          </div>
        </div>

        <div role="rowgroup">
          {rows.map((r, i) => {
            const pos = i + 1;
            const first = pos === 1;
            const last = pos === rows.length && rows.length > 2;
            const form = forms[r.team.id] ?? [];
            return (
              <div
                key={r.team.id}
                role="row"
                className="relative flex min-h-[56px] items-center gap-1 border-b border-border pl-3 pr-3 transition-colors last:border-b-0 has-[a:active]:bg-white/5"
              >
                <span
                  role="cell"
                  className={cn(
                    "w-6 shrink-0 text-center text-[length:min(0.8824rem,22.5px)] font-bold tabular-nums",
                    first ? "text-[#30d158]" : last ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {pos}
                  {first && <span className="sr-only">, líder</span>}
                  {last && <span className="sr-only">, último</span>}
                </span>
                <div role="cell" className="flex min-w-0 flex-1 items-center gap-2">
                  <TeamLogo name={r.team.name} logoUrl={r.team.logo_url} color={r.team.primary_color} size="xs" />
                  <div className="min-w-0">
                    {/* El enlace cubre toda la fila; el nombre es lo que se lee. */}
                    <Link
                      href={`/teams/${r.team.id}`}
                      className="block truncate text-[length:min(0.8824rem,22.5px)] font-semibold leading-tight after:absolute after:inset-0 after:content-['']"
                    >
                      <span className="sm:hidden">{r.team.short_name || r.team.name}</span>
                      <span className="hidden sm:inline">{r.team.name}</span>
                    </Link>
                    <FormDots form={form} className="mt-0.5 hidden origin-left scale-90 min-[400px]:inline-flex" />
                  </div>
                </div>
                {COLUMNS.map((c) => (
                  <span key={c.key} role="cell" className={cn(num, "wide" in c && wide, "text-[length:min(0.8824rem,22.5px)]")}>
                    {r[c.key]}
                  </span>
                ))}
                <span role="cell" className={cn(num, "w-8 text-[length:min(0.8824rem,22.5px)] text-muted-foreground")}>
                  {r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff < 0 ? `−${-r.goal_diff}` : 0}
                </span>
                <span role="cell" className={cn(num, "w-9 text-[length:min(1rem,25.5px)] font-bold")}>
                  {r.points}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 px-4 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
        Se ordena sola: puntos, diferencia de goles y goles a favor.
      </p>
    </div>
  );
}
