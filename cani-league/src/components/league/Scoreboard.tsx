"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { recordMatchResultClient, resetMatchResultClient } from "@/lib/data/mutations";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types";

type Side = MatchWithTeams["home_team"];

function Crest({ team, size = 48 }: { team: Side; size?: number }) {
  if (team.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.logo_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ width: size, height: size, background: team.primary_color || "#3a3a3c" }}
      aria-hidden
    >
      {(team.short_name || team.name).slice(0, 3).toUpperCase()}
    </span>
  );
}

function TeamColumn({ team, record }: { team: Side; record?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <Crest team={team} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-tight">{team.short_name || team.name}</p>
        {record && <p className="text-[12px] tabular-nums text-muted-foreground">{record}</p>}
      </div>
    </div>
  );
}

/** Tarjeta de partido como las de Apple Sports: escudos a los lados, marcador grande en el centro. */
function ScoreCard({ match, records, onOpen }: { match: MatchWithTeams; records: Record<string, string>; onOpen: () => void }) {
  const h = match.home_goals ?? 0;
  const a = match.away_goals ?? 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[22px] bg-card px-3 py-4 text-left transition-transform duration-150 active:scale-[0.98]"
      aria-label={`${match.home_team.name} contra ${match.away_team.name}${match.played ? `, ${h} a ${a}` : ", pendiente"}`}
    >
      <TeamColumn team={match.home_team} record={records[match.home_team_id]} />
      <div className="flex min-w-[6.5rem] flex-col items-center">
        {match.played ? (
          <p className="flex items-baseline gap-3 text-[34px] font-bold leading-none tabular-nums tracking-tight">
            <span className={cn(h < a && "text-muted-foreground")}>{h}</span>
            <span className={cn(a < h && "text-muted-foreground")}>{a}</span>
          </p>
        ) : (
          <p className="text-[17px] font-semibold text-muted-foreground">vs</p>
        )}
        <p className="mt-1.5 text-[12px] font-medium text-muted-foreground">
          {match.played ? "Final" : "Pendiente"}
        </p>
      </div>
      <TeamColumn team={match.away_team} record={records[match.away_team_id]} />
    </button>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[64px] font-bold leading-none tabular-nums">{value}</p>
      <div className="flex overflow-hidden rounded-full bg-secondary">
        <button
          type="button"
          aria-label={`Quitar gol a ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex size-11 items-center justify-center active:bg-white/10"
        >
          <Minus className="size-5" />
        </button>
        <span aria-hidden className="my-2.5 w-px bg-white/15" />
        <button
          type="button"
          aria-label={`Sumar gol a ${label}`}
          onClick={() => onChange(Math.min(30, value + 1))}
          className="flex size-11 items-center justify-center active:bg-white/10"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

function ResultSheet({ match, onClose }: { match: MatchWithTeams; onClose: () => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [home, setHome] = useState(match.home_goals ?? 0);
  const [away, setAway] = useState(match.away_goals ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onClose();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="gap-0 border-0 bg-card p-5 sm:max-w-md">
      <DialogTitle className="text-center text-[17px] font-semibold">
        Jornada {match.matchday} · {match.round === 2 ? "Vuelta" : "Ida"}
      </DialogTitle>
      <DialogDescription className="sr-only">Marcador del partido</DialogDescription>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {[
          { team: match.home_team, value: home, set: setHome },
          { team: match.away_team, value: away, set: setAway },
        ].map(({ team, value, set }) => (
          <div key={team.id} className="flex flex-col items-center gap-2">
            <Crest team={team} size={44} />
            <p className="max-w-full truncate text-[15px] font-semibold">{team.name}</p>
            <Stepper value={value} onChange={set} label={team.name} />
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

      <div className="mt-7 space-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => recordMatchResultClient(match.id, home, away))}
          className="h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {match.played ? "Guardar cambios" : "Guardar resultado"}
        </button>
        {match.played && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => resetMatchResultClient(match.id))}
            className="h-[50px] w-full rounded-full text-[17px] font-medium text-destructive active:bg-white/5 disabled:opacity-50"
          >
            Borrar resultado
          </button>
        )}
      </div>
    </DialogContent>
  );
}

/** Marcador por jornadas: selector de jornada arriba y una tarjeta por partido. */
export function Scoreboard({ matches, records }: { matches: MatchWithTeams[]; records: Record<string, string> }) {
  const matchdays = useMemo(
    () => Array.from(new Set(matches.map((m) => m.matchday))).sort((a, b) => a - b),
    [matches],
  );
  // Por defecto, la primera jornada con partidos pendientes (o la última si ya está todo jugado).
  const firstPending = matchdays.find((d) => matches.some((m) => m.matchday === d && !m.played));
  const [day, setDay] = useState<number>(firstPending ?? matchdays[matchdays.length - 1] ?? 1);
  const [openId, setOpenId] = useState<string | null>(null);

  const list = matches.filter((m) => m.matchday === day);
  const open = matches.find((m) => m.id === openId) ?? null;
  const phase = list[0]?.round === 2 ? "Vuelta" : "Ida";

  return (
    <section aria-label="Partidos por jornada" className="space-y-4">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <div role="tablist" aria-label="Jornada" className="flex w-max gap-2">
          {matchdays.map((d) => {
            const done = matches.filter((m) => m.matchday === d).every((m) => m.played);
            const active = d === day;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDay(d)}
                className={cn(
                  "h-9 min-w-[3.25rem] rounded-full px-3.5 text-[15px] font-semibold tabular-nums transition-colors",
                  active ? "bg-white text-black" : done ? "bg-card text-muted-foreground" : "bg-card text-foreground",
                )}
              >
                J{d}
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="text-[22px] font-bold tracking-tight">
        Jornada {day} <span className="text-muted-foreground">· {phase}</span>
      </h2>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => (
          <ScoreCard key={m.id} match={m} records={records} onOpen={() => setOpenId(m.id)} />
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && <ResultSheet key={open.id} match={open} onClose={() => setOpenId(null)} />}
      </Dialog>
    </section>
  );
}
