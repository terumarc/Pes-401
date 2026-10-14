"use client";

import { useMemo, useState, useTransition } from "react";
import { Award, Crown, Medal, Minus, Pencil, Plus, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/teams/TeamCard";
import { TrophyArt } from "@/components/trophies/TrophyArt";
import { changeTeamTrophyAction, setTrophyPrizeAction } from "@/app/actions/trophies";
import { formatMoney, parseMoneyInput } from "@/lib/format/money";
import { TROPHIES } from "@/constants";
import { cn } from "@/lib/utils";
import type { TeamTrophyCabinet, TrophyCounts, TrophyType } from "@/types";

const EMBLEM: Record<
  TrophyType,
  { Icon: typeof Crown; ring: string; glow: string; text: string }
> = {
  league: { Icon: Crown, ring: "#e8b53e", glow: "rgba(232,181,62,0.45)", text: "text-amber-200" },
  champions: { Icon: Star, ring: "#9fb4d6", glow: "rgba(150,180,230,0.45)", text: "text-sky-100" },
  cup: { Icon: Award, ring: "#e2475a", glow: "rgba(226,71,90,0.4)", text: "text-rose-100" },
  conference: { Icon: Medal, ring: "#4fd39a", glow: "rgba(79,211,154,0.4)", text: "text-emerald-100" },
};

function sortCabinets(list: TeamTrophyCabinet[]) {
  return [...list].sort(
    (a, b) =>
      b.total - a.total ||
      b.trophies.champions - a.trophies.champions ||
      b.trophies.league - a.trophies.league ||
      a.team.name.localeCompare(b.team.name),
  );
}

function compactMoney(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k €`;
  return `${value} €`;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(
    () => sortCabinets(initialCabinets)[0]?.team.id ?? null,
  );
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ranking = useMemo(() => sortCabinets(cabinets), [cabinets]);
  const selected = cabinets.find((c) => c.team.id === selectedId) ?? ranking[0];

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay equipos en la liga todavía.
      </p>
    );
  }

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

  function changeCount(trophy: TrophyType, delta: number) {
    const teamId = selected.team.id;
    const teamName = selected.team.name;
    if (pending) return;
    if (delta < 0 && selected.trophies[trophy] === 0) return;

    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await changeTeamTrophyAction(teamId, trophy, delta);
        applyResult(teamId, trophy, res.count, res.budget);
        if (res.budgetDelta > 0) {
          setNotice(`+${formatMoney(res.budgetDelta)} al presupuesto de ${teamName}`);
        } else if (res.budgetDelta < 0) {
          setNotice(`${formatMoney(res.budgetDelta)} descontados a ${teamName}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  async function savePrize(trophy: TrophyType, value: number) {
    const previous = prizes[trophy];
    setPrizes((p) => ({ ...p, [trophy]: value }));
    try {
      const saved = await setTrophyPrizeAction(leagueId, trophy, value);
      setPrizes((p) => ({ ...p, [trophy]: saved }));
    } catch (err) {
      setPrizes((p) => ({ ...p, [trophy]: previous }));
      setError(err instanceof Error ? err.message : "No se pudo guardar el premio");
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de vitrina */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex gap-2">
          {ranking.map((c) => {
            const active = c.team.id === selected.team.id;
            return (
              <button
                key={c.team.id}
                type="button"
                onClick={() => setSelectedId(c.team.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
                  active
                    ? "border-amber-400/50 bg-amber-400/10 text-foreground"
                    : "border-white/[0.08] bg-card/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <TeamLogo
                  name={c.team.name}
                  logoUrl={c.team.logo_url}
                  color={c.team.primary_color}
                  size="sm"
                />
                <span className="font-medium">{c.team.short_name || c.team.name}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                    active ? "bg-amber-400/20 text-amber-200" : "bg-white/[0.06]",
                  )}
                >
                  {c.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hornacina */}
      <section
        aria-label={`Vitrina de ${selected.team.name}`}
        className="relative overflow-hidden rounded-2xl border border-[#5a4127]/60 shadow-2xl"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 0%, #4a3725 0%, #2a1e14 55%, #160f09 100%)",
        }}
      >
        {/* Arco */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-10%] top-0 h-16 sm:h-24"
          style={{
            background: "linear-gradient(180deg,#6b5236,#3b2b1c)",
            borderBottomLeftRadius: "50% 100%",
            borderBottomRightRadius: "50% 100%",
            boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
          }}
        />
        {/* Ladrillos */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
            backgroundSize: "56px 28px, 56px 56px",
            backgroundPosition: "0 0, 28px 28px",
          }}
        />

        <div className="relative px-3 pb-0 pt-24 sm:px-8 sm:pt-32">
          {/* Placa del club */}
          <div className="absolute left-1/2 top-3 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300/30 bg-black/40 px-3 py-1.5 backdrop-blur-sm sm:top-6">
            <TeamLogo
              name={selected.team.name}
              logoUrl={selected.team.logo_url}
              color={selected.team.primary_color}
              size="sm"
            />
            <span className="max-w-[52vw] truncate font-display text-sm font-semibold text-amber-50 sm:max-w-none sm:text-base">
              {selected.team.name}
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-200">
              {selected.total} {selected.total === 1 ? "título" : "títulos"}
            </span>
          </div>
          <p className="absolute left-1/2 top-[3.6rem] -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-amber-100/70 sm:top-[4.6rem]">
            Presupuesto · {formatMoney(selected.team.budget)}
          </p>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 sm:gap-x-6">
            {TROPHIES.map((t) => (
              <TrophyNiche
                key={t.key}
                type={t.key}
                label={t.short}
                count={selected.trophies[t.key]}
                prize={prizes[t.key]}
                editing={editing}
                disabled={pending}
                onChange={(delta) => changeCount(t.key, delta)}
              />
            ))}
          </div>
        </div>

        {/* Repisa */}
        <div
          aria-hidden
          className="relative h-5 sm:h-7"
          style={{
            background: "linear-gradient(180deg,#8a6a45 0%,#5e4529 40%,#2a1d11 100%)",
            boxShadow: "0 -6px 18px rgba(0,0,0,0.5)",
          }}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {editing
            ? "Usa + y − en cada placa. Cada título suma su premio al presupuesto (y lo descuenta si lo quitas)."
            : "Elige un club arriba para ver su vitrina."}
          {pending && <span className="ml-2 text-amber-300">Guardando…</span>}
        </p>
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
          {editing ? "Hecho" : "Editar vitrina"}
        </Button>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {notice}
        </div>
      )}

      {editing && <PrizeEditor prizes={prizes} onSave={savePrize} />}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Palmarés */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Palmarés</h2>
        <ul className="space-y-2">
          {ranking.map((c, idx) => (
            <li key={c.team.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(c.team.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-card/60 p-3 text-left transition-colors hover:bg-card/90",
                  c.team.id === selected.team.id
                    ? "border-amber-400/40"
                    : "border-white/[0.08]",
                )}
              >
                <span className="w-5 text-center font-display text-sm tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
                <TeamLogo
                  name={c.team.name}
                  logoUrl={c.team.logo_url}
                  color={c.team.primary_color}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {c.team.name}
                </span>
                <span className="flex items-center gap-2 sm:gap-3">
                  {TROPHIES.map((t) => (
                    <span
                      key={t.key}
                      title={t.label}
                      className={cn(
                        "flex items-center gap-0.5 text-xs tabular-nums",
                        c.trophies[t.key] ? "text-foreground" : "text-muted-foreground/40",
                      )}
                    >
                      <TrophyArt
                        type={t.key}
                        dimmed={!c.trophies[t.key]}
                        className="h-5 w-4"
                      />
                      {c.trophies[t.key]}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TrophyNiche({
  type,
  label,
  count,
  prize,
  editing,
  disabled,
  onChange,
}: {
  type: TrophyType;
  label: string;
  count: number;
  prize: number;
  editing: boolean;
  disabled: boolean;
  onChange: (delta: number) => void;
}) {
  const emblem = EMBLEM[type];
  const won = count > 0;

  return (
    <div className="relative flex flex-col items-center">
      {/* Foco */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 h-56 w-32 sm:-top-24 sm:h-72 sm:w-44"
        style={{
          background: won
            ? "radial-gradient(50% 60% at 50% 30%, rgba(255,214,150,0.32), transparent 70%)"
            : "radial-gradient(50% 60% at 50% 30%, rgba(255,214,150,0.08), transparent 70%)",
        }}
      />

      {/* Medallón */}
      <div
        className="relative flex size-14 items-center justify-center rounded-full sm:size-20"
        style={{
          background: "radial-gradient(circle at 35% 30%, #2c3b63, #121a33)",
          boxShadow: won
            ? `0 0 0 3px ${emblem.ring}, 0 0 0 5px rgba(0,0,0,0.45), 0 0 22px ${emblem.glow}`
            : "0 0 0 3px #5b4a36, 0 0 0 5px rgba(0,0,0,0.45)",
          opacity: won ? 1 : 0.55,
        }}
      >
        <div className="absolute inset-1.5 rounded-full border border-dashed border-white/20" />
        <emblem.Icon className={cn("size-6 sm:size-8", emblem.text)} />
      </div>

      {/* Trofeo */}
      <TrophyArt
        type={type}
        dimmed={!won}
        className="relative -mt-1 h-28 w-20 sm:h-40 sm:w-28"
      />

      {/* Pedestal + placa */}
      <div className="relative w-full max-w-[9rem]">
        <div
          className="mx-auto h-2 w-3/4 rounded-t-sm"
          style={{ background: "linear-gradient(180deg,#e9dcc4,#b9a684)" }}
        />
        <div
          className="flex flex-col items-center rounded-md px-2 pb-2 pt-1.5"
          style={{
            background: "linear-gradient(180deg,#d8c8a8,#9e8a66)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 14px rgba(0,0,0,0.45)",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#3d2c17] sm:text-[11px]">
            {label}
          </span>
          {editing ? (
            <div className="mt-1 flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Quitar un título de ${label}`}
                onClick={() => onChange(-1)}
                disabled={disabled || count === 0}
                className="flex size-7 items-center justify-center rounded-full bg-[#3d2c17] text-amber-50 disabled:opacity-30"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-7 text-center font-display text-xl font-bold tabular-nums text-[#2a1d0e]">
                {count}
              </span>
              <button
                type="button"
                aria-label={`Añadir un título de ${label}`}
                onClick={() => onChange(1)}
                disabled={disabled}
                className="flex size-7 items-center justify-center rounded-full bg-[#3d2c17] text-amber-50 disabled:opacity-30"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : (
            <span className="font-display text-2xl font-black tabular-nums leading-tight text-[#2a1d0e]">
              ×{count}
            </span>
          )}
          <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-[#4a3519]/80">
            {prize > 0 ? `Premio ${compactMoney(prize)}` : "Sin premio"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PrizeEditor({
  prizes,
  onSave,
}: {
  prizes: TrophyCounts;
  onSave: (trophy: TrophyType, value: number) => void;
}) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-card/60 p-4">
      <h2 className="font-display text-sm font-semibold">Premio por título</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Se suma al presupuesto del club cada vez que añades ese título. Admite
        «25000000», «25.000.000» o «25M».
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TROPHIES.map((t) => (
          <PrizeField
            key={`${t.key}-${prizes[t.key]}`}
            label={t.label}
            value={prizes[t.key]}
            onSave={(v) => onSave(t.key, v)}
          />
        ))}
      </div>
    </section>
  );
}

function PrizeField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  const [invalid, setInvalid] = useState(false);

  function commit() {
    const parsed = draft.trim() === "" ? 0 : parseMoneyInput(draft);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== value) onSave(parsed);
  }

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <input
        inputMode="numeric"
        value={draft}
        placeholder="0"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(
          "h-9 rounded-md border bg-background/60 px-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40",
          invalid ? "border-destructive" : "border-white/[0.1]",
        )}
      />
      <span className={cn("tabular-nums", invalid ? "text-destructive" : "text-muted-foreground")}>
        {invalid ? "Cantidad no válida" : formatMoney(value)}
      </span>
    </label>
  );
}
