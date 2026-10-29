"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { recordDirectMatchClient, recordMatchResultClient, resetMatchResultClient } from "@/lib/data/mutations";
import { cn } from "@/lib/utils";
import { MatchCard } from "./MatchCard";
import { NEW_LEAGUE_MATCH_EVENT } from "./NewMatchButton";
import type { MatchWithTeams } from "@/types";
import { headToHead, type GoalRow, type MatchLite } from "@/lib/stats";
import { canActFor, useViewer } from "@/components/auth/ViewerProvider";

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

function ScoreCard({ match, records, onOpen }: { match: MatchWithTeams; records: Record<string, string>; onOpen: () => void }) {
  const h = match.home_goals ?? 0;
  const a = match.away_goals ?? 0;
  return (
    <MatchCard
      home={match.home_team}
      away={match.away_team}
      homeRecord={records[match.home_team_id]}
      awayRecord={records[match.away_team_id]}
      homeGoals={match.home_goals}
      awayGoals={match.away_goals}
      played={match.played}
      label={match.played ? "Final" : "Pendiente"}
      ariaLabel={`${match.home_team.name} contra ${match.away_team.name}${match.played ? `, ${h} a ${a}` : ", pendiente"}`}
      onOpen={onOpen}
    />
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
  const viewer = useViewer();
  // Apuntar o corregir el resultado: los dos clubes del partido o un admin.
  const canRecord = canActFor(viewer, match.home_team.id) || canActFor(viewer, match.away_team.id);

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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center large-text:grid-cols-1 large-text:justify-items-start large-text:gap-1">
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

      {!canRecord && (
        <p className="mt-6 text-center text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
          Solo pueden apuntar este partido {match.home_team.name}, {match.away_team.name} o un admin.
        </p>
      )}

      {canRecord && <div className="mt-7 space-y-2">
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
      </div>}
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
      <h3 className="mb-1.5 px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Historial · {h.games.length} {h.games.length === 1 ? "partido" : "partidos"}</h3>
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

/** Hoja iOS: asa, «Cancelar» a la izquierda y título. */
function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <>
      <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center large-text:grid-cols-1 large-text:justify-items-start large-text:gap-1">
        <button type="button" onClick={onClose} className="h-11 justify-self-start text-[length:min(1rem,25.5px)] text-[#0a84ff] active:opacity-60">
          Cancelar
        </button>
        <DialogTitle className="text-[length:min(1rem,25.5px)] font-semibold">{title}</DialogTitle>
        <span />
      </div>
    </>
  );
}

/**
 * Paso 1 de «Nuevo partido»: elegir local y visitante (como en las copas).
 * Debajo dice qué partido del calendario se va a apuntar.
 */
function PickMatchSheet({
  teams,
  matches,
  onClose,
  onFixture,
  onExtra,
}: {
  teams: Side[];
  matches: MatchWithTeams[];
  onClose: () => void;
  onFixture: (match: MatchWithTeams) => void;
  onExtra: (home: Side, away: Side) => void;
}) {
  const viewer = useViewer();
  const own = !viewer?.isAdmin && viewer?.teamId ? viewer.teamId : null;
  const [home, setHome] = useState<string | null>(own);
  const [away, setAway] = useState<string | null>(null);
  const label = (t: Side) => t.short_name || t.name;
  const sorted = [...teams].sort((a, b) => label(a).localeCompare(label(b), "es"));
  const byId = new Map(teams.map((t) => [t.id, t]));

  // El siguiente partido pendiente entre los dos, en cualquier orden.
  const fixture =
    home && away
      ? matches
          .filter(
            (m) =>
              !m.played &&
              ((m.home_team_id === home && m.away_team_id === away) || (m.home_team_id === away && m.away_team_id === home)),
          )
          .sort((a, b) => a.matchday - b.matchday)[0]
      : undefined;
  const allowed = !home || !away || canActFor(viewer, home) || canActFor(viewer, away);

  let note: string | null = null;
  if (home && away && allowed) {
    note = fixture
      ? `Se apunta la jornada ${fixture.matchday} · ${fixture.round === 2 ? "vuelta" : "ida"}, con ${label(byId.get(fixture.home_team_id)!)} en casa.`
      : "Ya jugaron la ida y la vuelta: se apunta como partido extra y cuenta para la tabla.";
  }

  const picker = (legend: string, value: string | null, set: (id: string) => void, other: string | null) => (
    <fieldset className="mt-4">
      <legend className="mb-1.5 px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={value === t.id}
            disabled={other === t.id}
            onClick={() => set(t.id)}
            className={cn(
              "flex min-h-11 min-w-0 items-center gap-2 rounded-full px-3 text-[length:min(0.8824rem,22.5px)] font-semibold transition-colors disabled:opacity-30",
              value === t.id ? "bg-white text-black" : "bg-secondary",
            )}
          >
            <Crest team={t} size={22} />
            <span className="truncate">{label(t)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      <SheetHeader title="Nuevo partido" onClose={onClose} />
      <DialogDescription className="px-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
        Elige quién ha jugado. El resultado y los goleadores van en el paso siguiente.
      </DialogDescription>

      {picker("Local", home, setHome, away)}
      {picker("Visitante", away, setAway, home)}

      {!allowed && (
        <p className="mt-4 text-center text-[length:min(0.8824rem,22.5px)] text-[#ffb340]">
          Solo puedes apuntar partidos de {viewer?.teamName ?? "tu club"}.
        </p>
      )}
      {note && <p className="mt-4 text-center text-[length:min(0.8824rem,22.5px)] text-muted-foreground">{note}</p>}

      <button
        type="button"
        disabled={!home || !away || !allowed}
        onClick={() => {
          if (!home || !away) return;
          if (fixture) onFixture(fixture);
          else onExtra(byId.get(home)!, byId.get(away)!);
        }}
        className="mt-6 h-[50px] w-full rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black transition-opacity active:opacity-80 disabled:opacity-40"
      >
        Siguiente
      </button>
    </DialogContent>
  );
}

/** Paso 2 cuando ya se jugaron la ida y la vuelta: marcador de un partido extra. */
function ExtraMatchSheet({ leagueId, home, away, onClose }: { leagueId: string; home: Side; away: Side; onClose: () => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [h, setH] = useState(0);
  const [a, setA] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await recordDirectMatchClient(leagueId, home.id, away.id, h, a);
      onClose();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el resultado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      <SheetHeader title="Partido extra" onClose={onClose} />
      <DialogDescription className="sr-only">Marcador del partido extra</DialogDescription>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {[
          { team: home, value: h, set: setH },
          { team: away, value: a, set: setA },
        ].map(({ team, value, set }) => (
          <div key={team.id} className="flex flex-col items-center gap-2">
            <Crest team={team} size={44} />
            <p className="max-w-full truncate text-[length:min(0.8824rem,22.5px)] font-semibold">{team.name}</p>
            <Stepper value={value} onChange={set} label={team.name} />
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-4 text-center text-[length:min(0.8824rem,22.5px)] text-destructive">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-7 h-[50px] w-full rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar resultado"}
      </button>
    </DialogContent>
  );
}

/** Partidos de la ida y de la vuelta, cada fase con todos sus partidos juntos: primero los que faltan por jugar. */
export function Scoreboard({
  leagueId,
  matches,
  records,
  extras,
}: {
  leagueId: string;
  matches: MatchWithTeams[];
  records: Record<string, string>;
  extras: Extras;
}) {
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
  const [picking, setPicking] = useState(false);
  const [extra, setExtra] = useState<{ home: Side; away: Side } | null>(null);

  // «Nuevo partido» vive en la cabecera de la página.
  useEffect(() => {
    const show = () => setPicking(true);
    window.addEventListener(NEW_LEAGUE_MATCH_EVENT, show);
    return () => window.removeEventListener(NEW_LEAGUE_MATCH_EVENT, show);
  }, []);

  // Clubes de la liga, sacados del calendario.
  const teams = useMemo(() => {
    const map = new Map<string, Side>();
    for (const m of matches) {
      map.set(m.home_team.id, m.home_team);
      map.set(m.away_team.id, m.away_team);
    }
    return [...map.values()];
  }, [matches]);

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
      <Dialog open={picking} onOpenChange={setPicking}>
        {picking && (
          <PickMatchSheet
            teams={teams}
            matches={matches}
            onClose={() => setPicking(false)}
            onFixture={(m) => {
              setPicking(false);
              setRound(m.round === 2 ? 2 : 1);
              setOpenId(m.id);
            }}
            onExtra={(home, away) => {
              setPicking(false);
              setExtra({ home, away });
            }}
          />
        )}
      </Dialog>
      <Dialog open={!!extra} onOpenChange={(o) => !o && setExtra(null)}>
        {extra && <ExtraMatchSheet leagueId={leagueId} home={extra.home} away={extra.away} onClose={() => setExtra(null)} />}
      </Dialog>
    </section>
  );
}
