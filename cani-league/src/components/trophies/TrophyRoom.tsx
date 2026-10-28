"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PixelTrophy } from "@/components/trophies/PixelTrophy";
import { changeTeamTrophyAction, setTrophyPrizeAction } from "@/app/actions/trophies";
import { formatMoney, parseMoneyInput } from "@/lib/format/money";
import { TROPHIES } from "@/constants";
import { cn } from "@/lib/utils";
import type { TeamTrophyCabinet, TrophyCounts, TrophyType } from "@/types";

const CARD = "relative overflow-hidden rounded-[22px] bg-card py-0 gap-0";

/** Color del halo de luz de cada competición en la estantería. */
const GLOW: Record<TrophyType, string> = {
  league: "rgba(245,190,70,0.22)",
  champions: "rgba(150,190,255,0.22)",
  cup: "rgba(240,90,105,0.2)",
  conference: "rgba(70,215,155,0.2)",
};

type Feedback = { kind: "ok" | "error"; text: string } | null;

function compactMoney(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k €`;
  return `${value} €`;
}

function sortByTotal(list: TeamTrophyCabinet[]) {
  return [...list].sort(
    (a, b) =>
      b.total - a.total ||
      b.trophies.champions - a.trophies.champions ||
      b.trophies.league - a.trophies.league ||
      a.team.name.localeCompare(b.team.name),
  );
}

export function TrophyRoom({
  leagueId,
  initialCabinets,
  initialPrizes,
}: {
  leagueId: string;
  initialCabinets: TeamTrophyCabinet[];
  initialPrizes: TrophyCounts;
}) {
  const [cabinets, setCabinets] = useState(initialCabinets);
  const [prizes, setPrizes] = useState(initialPrizes);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const ranking = useMemo(() => sortByTotal(cabinets), [cabinets]);

  function applyResult(teamId: string, trophy: TrophyType, count: number, budget: number) {
    setCabinets((prev) =>
      prev.map((c) => {
        if (c.team.id !== teamId) return c;
        const trophies = { ...c.trophies, [trophy]: count };
        const total = Object.values(trophies).reduce((a, b) => a + b, 0);
        return { ...c, trophies, total, team: { ...c.team, budget } };
      }),
    );
  }

  function changeTitles(teamId: string, trophy: TrophyType, delta: 1 | -1) {
    const cabinet = cabinets.find((c) => c.team.id === teamId);
    if (!cabinet || pending) return;
    if (delta < 0 && cabinet.trophies[trophy] === 0) return;
    const label = TROPHIES.find((t) => t.key === trophy)?.label ?? "";

    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await changeTeamTrophyAction(teamId, trophy, delta);
        applyResult(teamId, trophy, res.count, res.budget);
        const verb = delta > 0 ? "Título añadido" : "Título quitado";
        const money =
          res.budgetDelta !== 0
            ? ` · ${res.budgetDelta > 0 ? "+" : "−"}${compactMoney(Math.abs(res.budgetDelta))}, presupuesto ${formatMoney(res.budget)}`
            : "";
        setFeedback({ kind: "ok", text: `${verb}: ${label} para ${cabinet.team.name}${money}` });
      } catch (err) {
        setFeedback({
          kind: "error",
          text: err instanceof Error ? err.message : "No se pudo guardar el título. Inténtalo de nuevo.",
        });
      }
    });
  }

  async function savePrizes(next: TrophyCounts): Promise<string | null> {
    try {
      for (const t of TROPHIES) {
        if (next[t.key] === prizes[t.key]) continue;
        const saved = await setTrophyPrizeAction(leagueId, t.key, next[t.key]);
        setPrizes((p) => ({ ...p, [t.key]: saved }));
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "No se pudieron guardar los premios. Inténtalo de nuevo.";
    }
  }

  if (ranking.length === 0) {
    return <p className="text-sm text-muted-foreground">Añade equipos a la liga para empezar el palmarés.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Estantería: los cuatro trofeos y sus campeones */}
      <Card className={CARD}>
        <div className="grid grid-cols-1 gap-px bg-black sm:grid-cols-2 xl:grid-cols-4">
          {TROPHIES.map((t, i) => (
            <TrophyColumn
              key={t.key}
              index={i}
              type={t.key}
              label={t.label}
              prize={prizes[t.key]}
              cabinets={cabinets}
              disabled={pending}
              onRemove={(teamId) => changeTitles(teamId, t.key, -1)}
            />
          ))}
        </div>
      </Card>

      <AddTitle
        cabinets={ranking}
        prizes={prizes}
        pending={pending}
        feedback={feedback}
        onAdd={(teamId, trophy) => changeTitles(teamId, trophy, 1)}
      />

      <PrizesCard prizes={prizes} onSave={savePrizes} />

      <Standings ranking={ranking} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TrophyColumn({
  index,
  type,
  label,
  prize,
  cabinets,
  disabled,
  onRemove,
}: {
  index: number;
  type: TrophyType;
  label: string;
  prize: number;
  cabinets: TeamTrophyCabinet[];
  disabled: boolean;
  onRemove: (teamId: string) => void;
}) {
  const winners = cabinets
    .filter((c) => c.trophies[type] > 0)
    .sort((a, b) => b.trophies[type] - a.trophies[type] || a.team.name.localeCompare(b.team.name));
  const editions = winners.reduce((sum, c) => sum + c.trophies[type], 0);

  return (
    <section
      aria-label={label}
      className="flex flex-row bg-card motion-safe:animate-fade-up sm:flex-col"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      {/* Estante iluminado */}
      <div className="group relative flex w-28 shrink-0 items-center justify-center py-4 sm:h-52 sm:w-auto sm:items-end sm:pt-6 sm:pb-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-full transition-opacity duration-500"
          style={{
            background: `radial-gradient(55% 75% at 50% 100%, ${GLOW[type]}, transparent 70%)`,
            opacity: editions ? 1 : 0.25,
          }}
        />
        <PixelTrophy
          type={type}
          dimmed={editions === 0}
          title={label}
          delay={index * 240}
          className="relative h-24 sm:h-[168px] drop-shadow-[0_6px_0_rgba(0,0,0,0.35)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[steps(2)] motion-safe:group-hover:-translate-y-1.5"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-4 pr-4 sm:px-5 sm:pb-5 sm:pt-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold leading-tight">{label}</h2>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {editions} {editions === 1 ? "edición" : "ediciones"}
          </span>
        </div>

        <p className="text-[13px] text-muted-foreground">
          {prize > 0 ? (
            <>
              Premio <span className="font-medium text-foreground tabular-nums">{compactMoney(prize)}</span>
            </>
          ) : (
            "Sin premio"
          )}
        </p>

        {winners.length > 0 ? (
          <ul className="mt-3 space-y-0.5">
            {winners.map((c) => (
              <li key={c.team.id} className="group/row flex items-center gap-2 py-1 sm:pl-1">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: c.team.primary_color }}
                />
                <span className="min-w-0 flex-1 text-[15px] leading-tight">{c.team.name}</span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">×{c.trophies[type]}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Quitar un título de ${label} a ${c.team.name}`}
                  title="Quitar un título"
                  disabled={disabled}
                  onClick={() => onRemove(c.team.id)}
                  className="text-muted-foreground opacity-60 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
                >
                  <Minus />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[15px] text-muted-foreground">Nadie la ha ganado todavía.</p>
        )}
      </div>
    </section>
  );
}

function AddTitle({
  cabinets,
  prizes,
  pending,
  feedback,
  onAdd,
}: {
  cabinets: TeamTrophyCabinet[];
  prizes: TrophyCounts;
  pending: boolean;
  feedback: Feedback;
  onAdd: (teamId: string, trophy: TrophyType) => void;
}) {
  const [trophy, setTrophy] = useState<TrophyType>("league");
  const [teamId, setTeamId] = useState(cabinets[0]?.team.id ?? "");
  const team = cabinets.find((c) => c.team.id === teamId);
  const prize = prizes[trophy];

  return (
    <Card className={cn(CARD, "p-5")}>
      <h2 className="text-[20px] font-bold tracking-tight">Añadir título</h2>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="radiogroup" aria-label="Competición" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex-1">
          {TROPHIES.map((t) => {
            const active = t.key === trophy;
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTrophy(t.key)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  active ? "bg-white font-semibold text-black" : "bg-secondary text-foreground",
                )}
              >
                <PixelTrophy type={t.key} spin={false} className="h-6 shrink-0" />
                <span className="truncate">{t.short}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <NativeSelect
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            aria-label="Club"
            className="min-w-0 flex-1 lg:w-56 lg:flex-none [&_select]:h-11"
          >
            {cabinets.map((c) => (
              <NativeSelectOption key={c.team.id} value={c.team.id}>
                {c.team.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            size="lg"
            className="h-11 shrink-0 px-5"
            disabled={pending || !team}
            onClick={() => team && onAdd(team.team.id, trophy)}
          >
            <Plus />
            {pending ? "Guardando…" : "Añadir título"}
          </Button>
        </div>
      </div>

      <p
        aria-live="polite"
        className={cn(
          "mt-3 text-pretty text-[13px]",
          feedback?.kind === "error"
            ? "text-destructive"
            : feedback
              ? "text-[#30d158]"
              : "text-muted-foreground",
        )}
      >
        {feedback
          ? feedback.text
          : team && prize > 0
            ? `${team.team.name} recibirá ${formatMoney(prize)} (presupuesto actual ${formatMoney(team.team.budget)}).`
            : "Esta competición no tiene premio: el presupuesto no cambia. Puedes fijarlo en «Premio de cada trofeo»."}
      </p>
    </Card>
  );
}

function Standings({ ranking }: { ranking: TeamTrophyCabinet[] }) {
  const cols =
    "grid grid-cols-[1.25rem_1fr_repeat(4,1.6rem)_1.9rem] items-center gap-x-2 sm:grid-cols-[1.5rem_1fr_repeat(4,3rem)_3rem]";

  return (
    <Card className={CARD}>
      <h2 className="px-5 pt-5 text-[20px] font-bold tracking-tight">Palmarés</h2>
      <div className={cn(cols, "mt-3 border-b border-border px-5 pb-2 text-[12px] text-muted-foreground")}>
        <span>#</span>
        <span>Club</span>
        {TROPHIES.map((t) => (
          <span key={t.key} className="flex justify-center">
            <PixelTrophy type={t.key} spin={false} title={t.label} className="h-5" />
          </span>
        ))}
        <span className="text-right">Total</span>
      </div>
      <ol className="pb-2">
        {ranking.map((c, idx) => (
          <li key={c.team.id} className={cn(cols, "px-5 py-2.5 text-[15px]")}>
            <span className="tabular-nums text-muted-foreground">{idx + 1}</span>
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: c.team.primary_color }}
              />
              <span className="truncate">{c.team.name}</span>
            </span>
            {TROPHIES.map((t) => (
              <span
                key={t.key}
                className={cn("text-center tabular-nums", !c.trophies[t.key] && "text-muted-foreground/35")}
              >
                {c.trophies[t.key]}
              </span>
            ))}
            <span className="text-right font-bold tabular-nums">{c.total}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function PrizesCard({
  prizes,
  onSave,
}: {
  prizes: TrophyCounts;
  onSave: (next: TrophyCounts) => Promise<string | null>;
}) {
  const toDraft = (p: TrophyCounts) =>
    Object.fromEntries(TROPHIES.map((t) => [t.key, p[t.key] ? String(p[t.key]) : ""])) as Record<
      TrophyType,
      string
    >;
  const [drafts, setDrafts] = useState(() => toDraft(prizes));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Feedback>(null);

  const parsed = Object.fromEntries(
    TROPHIES.map((t) => [t.key, drafts[t.key].trim() === "" ? 0 : parseMoneyInput(drafts[t.key])]),
  ) as Record<TrophyType, number | null>;
  const invalid = TROPHIES.filter((t) => parsed[t.key] === null);
  const dirty = TROPHIES.some((t) => parsed[t.key] !== prizes[t.key]);

  async function save() {
    if (invalid.length || !dirty) return;
    setSaving(true);
    setMessage(null);
    const error = await onSave(parsed as TrophyCounts);
    setSaving(false);
    setMessage(error ? { kind: "error", text: error } : { kind: "ok", text: "Premios guardados." });
  }

  return (
    <Card className={cn(CARD, "p-5")}>
      <h2 className="text-[20px] font-bold tracking-tight">Premio de cada trofeo</h2>
      <p className="mt-1 text-pretty text-[13px] text-muted-foreground">
        Lo que cobra un club al ganar cada competición. Se suma a su presupuesto al añadir el título.
      </p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {TROPHIES.map((t) => {
            const value = parsed[t.key];
            return (
              <label key={t.key} className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                  <PixelTrophy type={t.key} spin={false} className="h-5" />
                  {t.label}
                </span>
                <Input
                  inputMode="numeric"
                  value={drafts[t.key]}
                  placeholder="0"
                  aria-invalid={value === null || undefined}
                  onChange={(e) => {
                    setMessage(null);
                    setDrafts((d) => ({ ...d, [t.key]: e.target.value }));
                  }}
                  className="tabular-nums"
                />
                <span
                  className={cn(
                    "text-[12px] tabular-nums",
                    value === null ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {value === null ? "Cantidad no válida" : formatMoney(value)}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            aria-live="polite"
            className={cn(
              "text-[13px]",
              message?.kind === "error"
                ? "text-destructive"
                : message
                  ? "text-[#30d158]"
                  : "text-muted-foreground",
            )}
          >
            {message
              ? message.text
              : invalid.length
                ? "Escribe cantidades como 25000000, 25.000.000 o 25M."
                : "Admite 25000000, 25.000.000 o 25M."}
          </p>
          <Button type="submit" size="lg" className="h-11 px-5" disabled={saving || !dirty || invalid.length > 0}>
            {saving ? "Guardando…" : "Guardar premios"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
