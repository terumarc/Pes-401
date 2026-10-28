import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TeamLogo } from "@/components/teams/TeamCard";
import { formatMoney } from "@/lib/format/money";
import type { TeamWithStanding } from "@/types";

/** Lista agrupada de clubes (iOS). En escritorio añade columnas de valor, media y jugadores. */
export function TeamList({ teams }: { teams: TeamWithStanding[] }) {
  const sorted = [...teams].sort((a, b) => a.position - b.position);
  return (
    <div className="overflow-hidden rounded-[22px] bg-card">
      <div className="hidden grid-cols-[1fr_9rem_9rem_5rem_5rem_1.5rem] gap-4 border-b border-border px-4 py-2.5 text-[length:min(0.7647rem,19.5px)] text-muted-foreground lg:grid">
        <span className="pl-[3.25rem]">Club</span>
        <span className="text-right">Presupuesto</span>
        <span className="text-right">Valor plantilla</span>
        <span className="text-right">Media</span>
        <span className="text-right">Jugadores</span>
        <span />
      </div>
      <ul>
        {sorted.map((t) => (
          <li key={t.id} className="group">
            <Link
              href={`/teams/${t.id}`}
              className="flex min-h-[68px] items-center gap-3 pl-4 transition-colors active:bg-white/[0.06] lg:hover:bg-white/[0.03]"
            >
              <span className="shrink-0 large-text:self-start large-text:pt-3"><TeamLogo name={t.name} logoUrl={t.logo_url} color={t.primary_color} size="md" /></span>
              <div className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border pr-3 group-last:border-b-0 lg:grid lg:grid-cols-[1fr_9rem_9rem_5rem_5rem_1.5rem] lg:gap-4">
                <div className="min-w-0 flex-1 py-3">
                  <p className="line-clamp-2 text-[length:min(1rem,25.5px)] font-semibold leading-tight">{t.name}</p>
                  <p className="line-clamp-2 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{t.owner_name?.trim() || "Sin propietario"}</p>
                  {/* Con letra grande el dinero va como tercera línea, bajo el nombre. */}
                  <p className="mt-2 hidden w-fit rounded-full bg-white/[0.08] px-3 py-1 text-[length:min(0.8824rem,22.5px)] font-semibold tabular-nums large-text:block lg:!hidden">{formatMoney(t.budget || 0)}</p>
                </div>
                <span className="shrink-0 text-right text-[length:min(0.8824rem,22.5px)] tabular-nums large-text:hidden lg:!block">
                  {formatMoney(t.budget || 0)}
                </span>
                <span className="hidden text-right text-[length:min(0.8824rem,22.5px)] tabular-nums text-muted-foreground lg:block">
                  {formatMoney(t.squad_value || 0)}
                </span>
                <span className="hidden text-right text-[length:min(0.8824rem,22.5px)] tabular-nums text-muted-foreground lg:block">
                  {t.avg_overall ? Math.round(t.avg_overall) : "–"}
                </span>
                <span className="hidden text-right text-[length:min(0.8824rem,22.5px)] tabular-nums text-muted-foreground lg:block">
                  {t.player_count || 0}
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#5a5a5f]" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
