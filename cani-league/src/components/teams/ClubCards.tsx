import Link from "next/link";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { TeamLogo } from "@/components/teams/TeamCard";
import { formatMoneyShort } from "@/lib/format/money";
import type { TeamWithStanding } from "@/types";

/** Cada club en su ficha, vestida con los colores de su equipación. */
function ClubCard({ team }: { team: TeamWithStanding }) {
  const primary = team.primary_color || "#3a3a3c";
  const secondary = team.secondary_color || primary;
  const delta =
    team.previous_position != null && team.previous_position !== team.position ? team.previous_position - team.position : 0;

  const stats = [
    { label: "Presupuesto", value: formatMoneyShort(team.budget || 0) },
    { label: "Valor", value: formatMoneyShort(team.squad_value || 0) },
    { label: "Jugadores", value: team.player_count ?? 0 },
  ];

  return (
    <li>
      <Link
        href={`/teams/${team.id}`}
        className="group relative isolate flex h-full flex-col overflow-hidden rounded-[22px] bg-card p-4 outline-none transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/60 lg:hover:-translate-y-0.5 lg:hover:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.7)]"
      >
        {/* El color del club se funde con la ficha, y la franja de la segunda equipación la cruza. */}
        <span
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: `linear-gradient(160deg, ${primary}b3 0%, ${primary}4d 42%, transparent 78%)` }}
        />
        <span
          aria-hidden
          className="absolute -top-8 right-16 -z-10 h-[150%] w-7 rotate-[22deg] opacity-40 [mask-image:linear-gradient(to_bottom,black_10%,transparent_60%)]"
          style={{ background: secondary }}
        />

        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full shadow-[0_6px_16px_-4px_rgba(0,0,0,0.55)]">
            <TeamLogo name={team.name} logoUrl={team.logo_url} color={primary} size="lg" />
          </span>
          <span
            className="flex items-center gap-0.5 rounded-full bg-black/40 px-2.5 py-1 text-[length:min(0.7647rem,19.5px)] font-semibold tabular-nums text-white"
            aria-label={`${team.position}º en la liga${delta ? (delta > 0 ? `, sube ${delta}` : `, baja ${-delta}`) : ""}`}
          >
            {delta > 0 && <ChevronUp className="size-3.5 text-[#30d158]" aria-hidden />}
            {delta < 0 && <ChevronDown className="size-3.5 text-[#ff453a]" aria-hidden />}
            {team.position}º en liga
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[length:min(1.1765rem,30px)] font-bold leading-tight tracking-tight text-white [text-wrap:balance]">
              {team.name}
            </h2>
            <p className="truncate text-[length:min(0.8824rem,22.5px)] text-white/70">{team.owner_name?.trim() || "Sin propietario"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[length:min(2.1176rem,54px)] font-bold leading-none tabular-nums tracking-tight text-white">
              {team.avg_overall ?? "–"}
            </p>
            <p className="mt-1 text-[length:min(0.7647rem,19.5px)] text-white/70">Media</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 border-t border-white/10 pt-3">
          {stats.map((s, i) => (
            <div key={s.label} className={i > 0 ? "border-l border-white/10 pl-3" : undefined}>
              <dt className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{s.label}</dt>
              <dd className="truncate text-[length:min(1rem,25.5px)] font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        {team.top_player && (
          <p className="mt-3 flex items-center gap-1.5 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
            <Star className="size-3.5 shrink-0 fill-[#ffd60a] text-[#ffd60a]" aria-hidden />
            <span className="truncate">
              <span className="text-foreground">{team.top_player.name}</span> es su estrella
            </span>
            <span className="ml-auto shrink-0 font-semibold tabular-nums text-foreground">{team.top_player.overall}</span>
          </p>
        )}
      </Link>
    </li>
  );
}

/** Fichas de todos los clubes, en el orden de la clasificación. */
export function ClubCards({ teams }: { teams: TeamWithStanding[] }) {
  const sorted = [...teams].sort((a, b) => a.position - b.position);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((t) => (
        <ClubCard key={t.id} team={t} />
      ))}
    </ul>
  );
}
