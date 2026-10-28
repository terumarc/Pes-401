"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { recordMatchResultClient, resetMatchResultClient } from "@/lib/data/mutations";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types";
import { headToHead, type GoalRow, type MatchLite } from "@/lib/stats";

export type Roster = { id: string; name: string }[];
type Extras = {
  rosters: Record<string, Roster>;
  goals: Record<string, GoalRow[]>;
  history: MatchLite[];
  teamNames: Record<string, string>;
};

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
        <p className="truncate text-[length:min(0.8824rem,22.5px)] font-semibold leading-tight">{team.short_name || team.name}</p>
        {record && <p className="text-[length:min(0.7059rem,18px)] tabular-nums text-muted-foreground">{record}</p>}
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
          <p className="flex items-baseline gap-3 text-[length:min(2rem,51px)] font-bold leading-none tabular-nums tracking-tight">
            <span className={cn(h < a && "text-muted-foreground")}>{h}</span>
            <span className={cn(a < h && "text-muted-foreground")}>{a}</span>
          </p>
        ) : (
          <p className="text-[length:min(1rem,25.5px)] font-semibold text-muted-foreground">vs</p>
        )}
        <p className="mt-1.5 text-[length:min(0.7059rem,18px)] font-medium text-muted-foreground">
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
      <p className="text-[length:min(3.7647rem,96px)] font-bold leading-none tabular-nums">{value}</p>
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

function ResultSheet({ match, onClose, extras }: { match: MatchWithTeams; onClose: () => void; extras: Extras }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [home, setHome] = useState(match.home_goals ?? 0);
  const [away, setAway] = useState(match.away_goals ?? 0);
  // Un hueco por gol: id del jugador o "" sin asignar. Se rellena con lo ya guardado.
  const initialPicks = (teamId: string) =>
    (extras.goals[match.id] ?? [])
      .filter((g) => g.team_id === teamId)
      .flatMap((g) => Array<string>(g.goals).fill(g.player_id ?? ""));
  const [picks, setPicks] = useState<Record<string, string[]>>(() => ({
    [match.home_team_id]: initialPicks(match.home_team_id),
    [match.away_team_id]: initialPicks(match.away_team_id),
  }));

  function scorersPayload() {
    const out: { teamId: string; playerId: string | null; playerName: string; goals: number }[] = [];
    for (const [teamId, count] of [
      [match.home_team_id, home],
      [match.away_team_id, away],
    ] as const) {
      const roster = extras.rosters[teamId] ?? [];
      for (const pid of (picks[teamId] ?? []).slice(0, count)) {
        const p = roster.find((r) => r.id === pid);
        if (!p) continue;
        const existing = out.find((o) => o.playerId === p.id);
        if (existing) existing.goals++;
        else out.push({ teamId, playerId: p.id, playerName: p.name, goals: 1 });
      }
    }
    return out;
  }
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
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      {/* Asa y barra superior de hoja iOS: Cancelar a la izquierda, título centrado. */}
      <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onClose} className="h-11 justify-self-start text-[length:min(1rem,25.5px)] text-[#0a84ff] active:opacity-60">
          Cancelar
        </button>
        <DialogTitle className="text-[length:min(1rem,25.5px)] font-semibold">
          Jornada {match.matchday} · {match.round === 2 ? "Vuelta" : "Ida"}
        </DialogTitle>
        <span />
      </div>
      <DialogDescription className="sr-only">Marcador del partido</DialogDescription>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {[
          { team: match.home_team, value: home, set: setHome },
          { team: match.away_team, value: away, set: setAway },
        ].map(({ team, value, set }) => (
          <div key={team.id} className="flex flex-col items-center gap-2">
            <Crest team={team} size={44} />
            <p className="max-w-full truncate text-[length:min(0.8824rem,22.5px)] font-semibold">{team.name}</p>
            <Stepper value={value} onChange={set} label={team.name} />
          </div>
        ))}
      </div>

      <ScorerPickers
        sides={[
          { team: match.home_team, count: home },
          { team: match.away_team, count: away },
        ]}
        rosters={extras.rosters}
        picks={picks}
        onPick={(teamId, i, pid) =>
          setPicks((prev) => {
            const next = [...(prev[teamId] ?? [])];
            next[i] = pid;
            return { ...prev, [teamId]: next };
          })
        }
      />

      <HeadToHeadBlock match={match} extras={extras} />

      {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

      <div className="mt-7 space-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => recordMatchResultClient(match.id, home, away, scorersPayload()))}
          className="h-[50px] w-full rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {match.played ? "Guardar cambios" : "Guardar resultado"}
        </button>
        {match.played && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => resetMatchResultClient(match.id))}
            className="h-[50px] w-full rounded-full text-[length:min(1rem,25.5px)] font-medium text-destructive active:bg-white/5 disabled:opacity-50"
          >
            Borrar resultado
          </button>
        )}
      </div>
    </DialogContent>
  );
}

/** Un desplegable por gol para elegir quién marcó. */
function ScorerPickers({
  sides,
  rosters,
  picks,
  onPick,
}: {
  sides: { team: Side; count: number }[];
  rosters: Record<string, Roster>;
  picks: Record<string, string[]>;
  onPick: (teamId: string, index: number, playerId: string) => void;
}) {
  if (sides.every((s) => s.count === 0)) return null;
  return (
    <section aria-label="Goleadores" className="mt-6">
      <h3 className="mb-1.5 px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Goleadores</h3>
      <div className="overflow-hidden rounded-[14px] bg-secondary">
        {sides.flatMap(({ team, count }) =>
          Array.from({ length: count }, (_, i) => (
            <label key={`${team.id}-${i}`} className="flex min-h-11 items-center gap-3 border-b border-border px-3 last:border-b-0">
              <Crest team={team} size={22} />
              <span className="sr-only">
                Gol {i + 1} de {team.name}
              </span>
              <select
                value={picks[team.id]?.[i] ?? ""}
                onChange={(e) => onPick(team.id, i, e.target.value)}
                className="h-11 min-w-0 flex-1 bg-transparent text-[length:min(1rem,25.5px)] outline-none"
              >
                <option value="">Sin asignar</option>
                {(rosters[team.id] ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )),
        )}
      </div>
    </section>
  );
}

/** Historial entre los dos clubes en todas las temporadas. */
function HeadToHeadBlock({ match, extras }: { match: MatchWithTeams; extras: Extras }) {
  const a = match.home_team_id;
  const b = match.away_team_id;
  const h = headToHead(
    extras.history.filter((m) => m.id !== match.id),
    a,
    b,
  );
  const nameOf = (id: string) => extras.teamNames[id] ?? "?";
  if (h.games.length === 0) {
    return <p className="mt-6 px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Primer enfrentamiento entre estos clubes.</p>;
  }
  const line = (m: MatchLite) => `${nameOf(m.home_team_id)} ${m.home_goals}–${m.away_goals} ${nameOf(m.away_team_id)}`;
  return (
    <section aria-label="Historial" className="mt-6">
      <h3 className="mb-1.5 px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Historial · {h.games.length} partidos</h3>
      <div className="overflow-hidden rounded-[14px] bg-secondary">
        <div className="grid grid-cols-3 border-b border-border py-2.5 text-center">
          {[
            { v: h.winsA, l: `Gana ${nameOf(a)}` },
            { v: h.draws, l: "Empates" },
            { v: h.winsB, l: `Gana ${nameOf(b)}` },
          ].map((x) => (
            <div key={x.l}>
              <p className="text-[length:min(1.1765rem,30px)] font-bold tabular-nums">{x.v}</p>
              <p className="truncate px-1 text-[length:min(0.7059rem,18px)] text-muted-foreground">{x.l}</p>
            </div>
          ))}
        </div>
        {h.biggest && (
          <p className="border-b border-border px-3 py-2.5 text-[length:min(0.8824rem,22.5px)]">
            <span className="text-muted-foreground">Mayor victoria · </span>
            {line(h.biggest)}
          </p>
        )}
        {h.games.slice(0, 5).map((m) => (
          <p key={m.id} className="flex justify-between gap-3 border-b border-border px-3 py-2 text-[length:min(0.8824rem,22.5px)] tabular-nums last:border-b-0">
            <span>{line(m)}</span>
            {m.season && <span className="shrink-0 text-muted-foreground">{m.season}</span>}
          </p>
        ))}
      </div>
    </section>
  );
}

/** Partidos de la ida y de la vuelta, cada fase con todos sus partidos juntos: primero los que faltan por jugar. */
export function Scoreboard({ matches, records, extras }: { matches: MatchWithTeams[]; records: Record<string, string>; extras: Extras }) {
  const byRound = useMemo(() => {
    const order = (x: MatchWithTeams, y: MatchWithTeams) => x.matchday - y.matchday;
    return {
      1: matches.filter((m) => m.round !== 2).sort(order),
      2: matches.filter((m) => m.round === 2).sort(order),
    } as const;
  }, [matches]);
  // Por defecto, la ida si aún le quedan partidos; si no, la vuelta.
  const [round, setRound] = useState<1 | 2>(
    byRound[1].some((m) => !m.played) || !byRound[2].length ? 1 : 2,
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const list = byRound[round];
  const pending = list.filter((m) => !m.played);
  const played = list.filter((m) => m.played);
  const open = matches.find((m) => m.id === openId) ?? null;

  const group = (title: string, items: MatchWithTeams[]) =>
    items.length > 0 && (
      <section aria-label={title} className="space-y-3">
        <h2 className="px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
          {title} <span className="text-muted-foreground tabular-nums">{items.length}</span>
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <ScoreCard key={m.id} match={m} records={records} onOpen={() => setOpenId(m.id)} />
          ))}
        </div>
      </section>
    );

  return (
    <section aria-label="Partidos de liga" className="space-y-6">
      <div role="tablist" aria-label="Fase" className="flex h-9 w-full rounded-[9px] bg-input p-[2px] sm:max-w-xs">
        {([1, 2] as const).map((r) => {
          const all = byRound[r];
          const done = all.filter((m) => m.played).length;
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={round === r}
              onClick={() => setRound(r)}
              className={cn(
                "flex-1 rounded-[7px] text-[length:min(0.7647rem,19.5px)] font-semibold tabular-nums transition-colors",
                round === r ? "bg-[#636366] text-white" : "text-[#ebebf5]/60",
              )}
            >
              {r === 1 ? "Ida" : "Vuelta"} · {done}/{all.length}
            </button>
          );
        })}
      </div>

      {list.length === 0 && <p className="px-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">No hay partidos en esta fase.</p>}
      {group("Por jugar", pending)}
      {group("Jugados", played)}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && <ResultSheet key={open.id} match={open} extras={extras} onClose={() => setOpenId(null)} />}
      </Dialog>
    </section>
  );
}
