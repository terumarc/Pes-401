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
              <TeamLogo name={t.name} logoUrl={t.logo_url} color={t.primary_color} size="md" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 self-stretch border-b border-border pr-3 group-last:border-b-0 max-lg:pb-3 lg:grid lg:grid-cols-[1fr_9rem_9rem_5rem_5rem_1.5rem] lg:gap-4">
                <div className="min-w-[7rem] flex-1 pt-3 lg:py-3">
                  <p className="line-clamp-2 text-[length:min(1rem,25.5px)] font-semibold leading-tight">{t.name}</p>
                  <p className="line-clamp-2 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{t.owner_name?.trim() || "Sin propietario"}</p>
                </div>
                {/* En móvil la flecha va pegada al dinero, para que bajen juntos si el nombre ocupa más. */}
                <span className="ml-auto flex shrink-0 items-center justify-end gap-3 text-right text-[length:min(0.8824rem,22.5px)] tabular-nums max-lg:pt-3">
                  {formatMoney(t.budget || 0)}
                  <ChevronRight className="size-4 shrink-0 text-[#5a5a5f] lg:hidden" aria-hidden />
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
                <ChevronRight className="hidden size-4 shrink-0 text-[#5a5a5f] lg:block" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
