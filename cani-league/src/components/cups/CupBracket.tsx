"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { arrangeCupTieAction, drawCupsAction, recordCupLegAction } from "@/app/actions/cups";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/use-confirm";
import { CUP_LABELS, currentTieOf, planCupMatch, roundName, tieState, type CupTie, type CupTrophy } from "@/lib/cups";
import { cn } from "@/lib/utils";

export type CupTeam = { id: string; name: string; short_name: string | null; logo_url: string | null; primary_color: string | null };

function Crest({ team, size = 28 }: { team?: CupTeam; size?: number }) {
  if (!team) return <span className="shrink-0 rounded-full bg-[#2c2c2e]" style={{ width: size, height: size }} aria-hidden />;
  if (team.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.logo_url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return <span className="shrink-0 rounded-full" style={{ width: size, height: size, background: team.primary_color ?? "#3a3a3c" }} aria-hidden />;
}

function TieCard({ tie, teams, onOpen }: { tie: CupTie; teams: Map<string, CupTeam>; onOpen: () => void }) {
  const st = tieState(tie);
  const home = tie.home_team_id ? teams.get(tie.home_team_id) : undefined;
  const away = tie.away_team_id ? teams.get(tie.away_team_id) : undefined;
  const bye = !!home && !tie.away_team_id && tie.round === 1;
  const ready = !!home && !!away;
  const legs = (side: "home" | "away") =>
    st.legs === 1
      ? [side === "home" ? tie.leg1_home_goals : tie.leg1_away_goals]
      : [side === "home" ? tie.leg1_home_goals : tie.leg1_away_goals, side === "home" ? tie.leg2_home_goals : tie.leg2_away_goals];

  const row = (team: CupTeam | undefined, side: "home" | "away") => {
    const won = st.winner && team && st.winner === team.id;
    const lost = st.winner && team && st.winner !== team.id;
    return (
      <div className={cn("flex min-h-11 items-center gap-3", lost && "text-muted-foreground")}>
        <Crest team={team} />
        <span className={cn("min-w-0 flex-1 truncate text-[17px]", won && "font-semibold")}>
          {team?.name ?? (bye && side === "away" ? "Pasa directo" : "Por decidir")}
        </span>
        {!bye &&
          legs(side).map((g, i) => (
            <span key={i} className="w-6 text-center text-[17px] tabular-nums text-muted-foreground">
              {g ?? "–"}
            </span>
          ))}
        {st.legs === 2 && !bye && (
          <span className="w-7 text-right text-[17px] font-bold tabular-nums">{side === "home" ? st.aggHome ?? "" : st.aggAway ?? ""}</span>
        )}
      </div>
    );
  };

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={onOpen}
      className="w-full min-w-0 rounded-[22px] bg-card px-4 py-2 text-left transition-transform active:scale-[0.99] disabled:active:scale-100"
    >
      {row(home, "home")}
      <div className="ml-10 border-t border-border" />
      {row(away, "away")}
      {st.needsPenalties && <p className="pb-1 text-[13px] text-[#ff9f0a]">Empate en el global: elige quién pasa en los penaltis.</p>}
      {st.winner && tie.penalty_winner_id === st.winner && !bye && (
        <p className="pb-1 text-[13px] text-muted-foreground">Pasa {teams.get(st.winner)?.name} en los penaltis.</p>
      )}
    </button>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[48px] font-bold leading-none tabular-nums">{value}</p>
      <div className="flex overflow-hidden rounded-full bg-secondary">
        <button type="button" aria-label={`Quitar gol a ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="flex size-11 items-center justify-center active:bg-white/10">
          <Minus className="size-5" />
        </button>
        <span aria-hidden className="my-2.5 w-px bg-white/15" />
        <button type="button" aria-label={`Sumar gol a ${label}`} onClick={() => onChange(Math.min(30, value + 1))} className="flex size-11 items-center justify-center active:bg-white/10">
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

function TieSheet({ tie, teams, onClose, initialLeg }: { tie: CupTie; teams: Map<string, CupTeam>; onClose: () => void; initialLeg?: 1 | 2 }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const home = teams.get(tie.home_team_id!)!;
  const away = teams.get(tie.away_team_id!)!;
  const twoLegs = !tie.is_final;
  const [leg, setLeg] = useState<1 | 2>(twoLegs ? initialLeg ?? (tie.leg1_home_goals != null ? 2 : 1) : 1);
  const [g, setG] = useState({
    1: { h: tie.leg1_home_goals ?? 0, a: tie.leg1_away_goals ?? 0 },
    2: { h: tie.leg2_home_goals ?? 0, a: tie.leg2_away_goals ?? 0 },
  });
  const [pen, setPen] = useState<string | null>(tie.penalty_winner_id);
  const [error, setError] = useState<string | null>(null);

  // Global con lo que hay en pantalla, para saber si hacen falta penaltis.
  const preview = tieState({
    ...tie,
    leg1_home_goals: leg === 1 ? g[1].h : tie.leg1_home_goals,
    leg1_away_goals: leg === 1 ? g[1].a : tie.leg1_away_goals,
    leg2_home_goals: leg === 2 ? g[2].h : tie.leg2_home_goals,
    leg2_away_goals: leg === 2 ? g[2].a : tie.leg2_away_goals,
    penalty_winner_id: null,
  });
  // En la vuelta juega en casa el segundo equipo: se enseña en ese orden.
  const [left, right] = leg === 2 ? [away, home] : [home, away];
  const set = (side: "h" | "a", n: number) => setG((prev) => ({ ...prev, [leg]: { ...prev[leg], [side]: n } }));

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await recordCupLegAction(tie.id, leg, g[leg].h, g[leg].a, preview.needsPenalties ? pen : null);
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onClose} className="h-11 justify-self-start text-[17px] text-[#0a84ff] active:opacity-60">
          Cancelar
        </button>
        <DialogTitle className="text-[17px] font-semibold">{CUP_LABELS[tie.trophy as CupTrophy]}</DialogTitle>
        <span />
      </div>
      <DialogDescription className="sr-only">Resultado de la eliminatoria</DialogDescription>

      {twoLegs && (
        <div role="tablist" aria-label="Partido" className="mt-3 flex h-9 rounded-[9px] bg-input p-[2px]">
          {([1, 2] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={leg === l}
              onClick={() => setLeg(l)}
              className={cn("flex-1 rounded-[7px] text-[13px] font-semibold", leg === l ? "bg-[#636366] text-white" : "text-[#ebebf5]/60")}
            >
              {l === 1 ? "Ida" : "Vuelta"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        {[left, right].map((team) => {
          const side = team.id === home.id ? "h" : "a";
          return (
            <div key={team.id} className="flex flex-col items-center gap-2">
              <Crest team={team} size={40} />
              <p className="max-w-full truncate text-[15px] font-semibold">{team.name}</p>
              <Stepper value={g[leg][side]} onChange={(n) => set(side, n)} label={team.name} />
            </div>
          );
        })}
      </div>

      {preview.aggHome != null && twoLegs && (
        <p className="mt-4 text-center text-[15px] text-muted-foreground tabular-nums">
          Global: {home.short_name ?? home.name} {preview.aggHome} – {preview.aggAway} {away.short_name ?? away.name}
        </p>
      )}

      {preview.needsPenalties && (
        <fieldset className="mt-4">
          <legend className="mb-1.5 px-1 text-[13px] text-muted-foreground">¿Quién gana en los penaltis?</legend>
          <div className="flex gap-2">
            {[home, away].map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={pen === t.id}
                onClick={() => setPen(t.id)}
                className={cn("h-11 flex-1 rounded-full text-[15px] font-semibold", pen === t.id ? "bg-white text-black" : "bg-secondary")}
              >
                {t.short_name ?? t.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {error && <p className="mt-3 text-center text-[15px] text-destructive">{error}</p>}
      <button
        type="button"
        onClick={save}
        disabled={pending || (preview.needsPenalties && !pen)}
        className="mt-6 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black disabled:opacity-40"
      >
        {pending ? "Guardando…" : `Guardar ${twoLegs ? (leg === 1 ? "la ida" : "la vuelta") : "la final"}`}
      </button>
    </DialogContent>
  );
}

/** Elegir los dos equipos que han jugado, como en la liga; el cuadro se ajusta si hace falta. */
function PickMatchSheet({
  leagueId,
  trophy,
  ties,
  teams,
  onClose,
  onReady,
}: {
  leagueId: string;
  trophy: CupTrophy;
  ties: CupTie[];
  teams: Map<string, CupTeam>;
  onClose: () => void;
  onReady: (tie: CupTie, leg: 1 | 2) => void;
}) {
  const [home, setHome] = useState<string | null>(null);
  const [away, setAway] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const alive = [...teams.values()]
    .filter((t) => currentTieOf(ties, t.id))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const name = (id: string) => teams.get(id)?.name ?? "Ese equipo";
  const plan = home && away ? planCupMatch(ties, home, away, name) : null;
  const rounds = ties.length ? Math.max(...ties.map((t) => t.round)) : 0;

  let note: string | null = null;
  if (plan?.ok) {
    const what = plan.tie.is_final ? "la final" : `${plan.leg === 1 ? "la ida" : "la vuelta"} de ${roundName(plan.tie.round, rounds).toLowerCase()}`;
    note = plan.swap
      ? `Se apunta ${what}. Como no estaban emparejados, ${name(plan.swap.home)} pasa a jugar contra ${name(plan.swap.away)}.`
      : `Se apunta ${what}.`;
  }

  function next() {
    if (!home || !away) return;
    setError(null);
    startTransition(async () => {
      try {
        const { tie, leg } = await arrangeCupTieAction(leagueId, trophy, home, away);
        onReady(tie, leg);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo preparar el partido.");
      }
    });
  }

  const picker = (label: string, value: string | null, set: (id: string) => void, other: string | null) => (
    <fieldset className="mt-4">
      <legend className="mb-1.5 px-1 text-[13px] text-muted-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {alive.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={value === t.id}
            disabled={other === t.id}
            onClick={() => set(t.id)}
            className={cn(
              "flex h-11 min-w-0 items-center gap-2 rounded-full px-3 text-[15px] font-semibold disabled:opacity-30",
              value === t.id ? "bg-white text-black" : "bg-secondary",
            )}
          >
            <Crest team={t} size={22} />
            <span className="truncate">{t.short_name ?? t.name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onClose} className="h-11 justify-self-start text-[17px] text-[#0a84ff] active:opacity-60">
          Cancelar
        </button>
        <DialogTitle className="text-[17px] font-semibold">Apuntar partido</DialogTitle>
        <span />
      </div>
      <DialogDescription className="px-1 text-[15px] text-muted-foreground">
        {CUP_LABELS[trophy]}: elige quién ha jugado. Si no era el cruce del sorteo, se cambia.
      </DialogDescription>

      {alive.length < 2 ? (
        <p className="mt-6 text-center text-[15px] text-muted-foreground">No quedan partidos por jugar en esta copa.</p>
      ) : (
        <>
          {picker("Local", home, setHome, away)}
          {picker("Visitante", away, setAway, home)}
        </>
      )}

      {plan && !plan.ok && <p className="mt-4 text-center text-[15px] text-[#ff9f0a]">{plan.error}</p>}
      {note && <p className="mt-4 text-center text-[15px] text-muted-foreground">{note}</p>}
      {error && <p className="mt-3 text-center text-[15px] text-destructive">{error}</p>}

      <button
        type="button"
        onClick={next}
        disabled={pending || !plan?.ok}
        className="mt-6 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black disabled:opacity-40"
      >
        {pending ? "Preparando…" : "Apuntar resultado"}
      </button>
    </DialogContent>
  );
}

/** Cuadro de una copa por rondas, con sorteo y resultados. */
export function CupBracket({
  leagueId,
  trophy,
  ties,
  teams,
}: {
  leagueId: string;
  trophy: CupTrophy;
  ties: CupTie[];
  teams: CupTeam[];
}) {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  // Cruce recién preparado desde «Apuntar partido», hasta que llegue el cuadro actualizado.
  const [arranged, setArranged] = useState<{ tie: CupTie; leg: 1 | 2 } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(teams.map((t) => [t.id, t]));
  const rounds = ties.length ? Math.max(...ties.map((t) => t.round)) : 0;
  const final = ties.find((t) => t.is_final);
  const champion = final?.winner_team_id ? byId.get(final.winner_team_id) : undefined;
  const open = arranged?.tie ?? ties.find((t) => t.id === openId) ?? null;
  const closeTie = () => {
    setOpenId(null);
    setArranged(null);
  };

  function draw(all: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await drawCupsAction(leagueId, all ? undefined : trophy);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo hacer el sorteo.");
      }
    });
  }

  if (!ties.length) {
    return (
      <div className="rounded-[22px] bg-card px-6 py-10 text-center">
        <p className="text-[17px] font-semibold">Aún no se han sorteado las copas</p>
        <p className="mx-auto mt-1 max-w-xs text-[15px] text-muted-foreground">
          Entran todos los clubes. Eliminatorias a ida y vuelta y final a un partido.
        </p>
        <button
          type="button"
          onClick={() => draw(true)}
          disabled={pending}
          className="mt-5 h-11 rounded-full bg-white px-6 text-[17px] font-semibold text-black disabled:opacity-50"
        >
          {pending ? "Sorteando…" : "Sortear las tres copas"}
        </button>
        {error && <p className="mt-3 text-[15px] text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {!champion && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black active:opacity-80"
        >
          <Plus className="size-5" aria-hidden /> Apuntar partido
        </button>
      )}
      {champion && (
        <div className="flex items-center gap-3 rounded-[22px] bg-card px-4 py-3">
          <Crest team={champion} size={40} />
          <div>
            <p className="text-[13px] text-muted-foreground">Campeón</p>
            <p className="text-[20px] font-bold">{champion.name}</p>
          </div>
        </div>
      )}

      {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
        <section key={r} aria-label={roundName(r, rounds)}>
          <h2 className="mb-2 px-1 text-[20px] font-bold tracking-tight">
            {roundName(r, rounds)}
            {r < rounds && <span className="text-muted-foreground"> · ida y vuelta</span>}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ties
              .filter((t) => t.round === r)
              .map((t) => (
                <TieCard key={t.id} tie={t} teams={byId} onOpen={() => setOpenId(t.id)} />
              ))}
          </div>
        </section>
      ))}

      <div className="px-1">
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              title: `Volver a sortear la ${CUP_LABELS[trophy]}`,
              description: "Se borran los cruces y resultados de esta copa en la temporada actual. Los títulos ya entregados no se quitan.",
              confirmLabel: "Volver a sortear",
              destructive: true,
            });
            if (ok) draw(false);
          }}
          className="h-11 rounded-full bg-card px-4 text-[15px] font-semibold text-destructive disabled:opacity-50"
        >
          Volver a sortear esta copa
        </button>
        {error && <p className="mt-2 text-[15px] text-destructive">{error}</p>}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && closeTie()}>
        {open && (
          <TieSheet
            key={`${open.id}:${open.home_team_id}:${open.away_team_id}`}
            tie={open}
            teams={byId}
            initialLeg={arranged?.leg}
            onClose={closeTie}
          />
        )}
      </Dialog>
      <Dialog open={picking} onOpenChange={setPicking}>
        {picking && (
          <PickMatchSheet
            leagueId={leagueId}
            trophy={trophy}
            ties={ties}
            teams={byId}
            onClose={() => setPicking(false)}
            onReady={(tie, leg) => {
              setPicking(false);
              setArranged({ tie, leg });
              router.refresh();
            }}
          />
        )}
      </Dialog>
      {confirmDialog}
    </div>
  );
}
