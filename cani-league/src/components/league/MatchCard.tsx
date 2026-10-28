import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MatchCardTeam = {
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

function Crest({ team, size }: { team: MatchCardTeam; size: number }) {
  if (team.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.logo_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
      style={{ width: size, height: size, background: team.primary_color || "#3a3a3c" }}
      aria-hidden
    >
      {(team.short_name || team.name).slice(0, 3).toUpperCase()}
    </span>
  );
}

/**
 * Tarjeta de partido (liga y copas).
 * Con letra normal: escudos a los lados y marcador en el centro, como Apple Sports.
 * Con letra grande: una fila por equipo (escudo, nombre y goles) y la fase debajo,
 * para que nada se apriete ni se corte.
 */
export function MatchCard({
  home,
  away,
  homeRecord,
  awayRecord,
  homeGoals,
  awayGoals,
  played,
  label,
  note,
  ariaLabel,
  onOpen,
}: {
  home: MatchCardTeam;
  away: MatchCardTeam;
  homeRecord?: string;
  awayRecord?: string;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
  /** Fase o estado: «Pendiente», «Final», «Cuartos de final · Ida»… */
  label: string;
  /** Aviso opcional debajo (por ejemplo, faltan penaltis). */
  note?: ReactNode;
  ariaLabel: string;
  onOpen: () => void;
}) {
  const h = homeGoals ?? 0;
  const a = awayGoals ?? 0;

  const side = (team: MatchCardTeam, record?: string) => (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <Crest team={team} size={48} />
      <div className="min-w-0 max-w-full">
        <p className="truncate text-[length:min(0.8824rem,22.5px)] font-semibold leading-tight">{team.short_name || team.name}</p>
        {record && <p className="text-[length:min(0.7059rem,18px)] tabular-nums text-muted-foreground">{record}</p>}
      </div>
    </div>
  );

  const row = (team: MatchCardTeam, goals: number, lost: boolean, record?: string) => (
    <div className={cn("flex min-h-11 items-center gap-3", played && lost && "text-muted-foreground")}>
      <Crest team={team} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[length:min(1rem,25.5px)] font-semibold leading-tight">{team.name}</p>
        {record && <p className="text-[length:min(0.7647rem,19.5px)] tabular-nums text-muted-foreground">{record}</p>}
      </div>
      {played && <span className="shrink-0 text-[length:min(1.6471rem,42px)] font-bold tabular-nums leading-none">{goals}</span>}
    </div>
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="w-full rounded-[22px] bg-card px-3 py-4 text-left transition-transform duration-150 active:scale-[0.98] large-text:px-4"
    >
      {/* Letra normal */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 large-text:hidden">
        {side(home, homeRecord)}
        <div className="flex min-w-[6.5rem] flex-col items-center text-center">
          {played ? (
            <p className="flex items-baseline gap-3 text-[length:min(2rem,51px)] font-bold leading-none tabular-nums tracking-tight">
              <span className={cn(h < a && "text-muted-foreground")}>{h}</span>
              <span className={cn(a < h && "text-muted-foreground")}>{a}</span>
            </p>
          ) : (
            <p className="text-[length:min(1rem,25.5px)] font-semibold text-muted-foreground">vs</p>
          )}
          <p className="mt-1.5 text-[length:min(0.7059rem,18px)] font-medium text-muted-foreground">{label}</p>
          {note}
        </div>
        {side(away, awayRecord)}
      </div>

      {/* Letra grande */}
      <div className="hidden large-text:block">
        {row(home, h, h < a, homeRecord)}
        <div className="my-2 ml-12 border-t border-border" />
        {row(away, a, a < h, awayRecord)}
        <p className="mt-2 pl-12 text-[length:min(0.7647rem,19.5px)] font-medium text-muted-foreground">{label}</p>
        {note && <div className="pl-12">{note}</div>}
      </div>
    </button>
  );
}
