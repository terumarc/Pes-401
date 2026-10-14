"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, Trophy, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { TeamLogo } from "@/components/teams/TeamCard";
import { PixelTrophy } from "@/components/trophies/PixelTrophy";
import { changeTeamTrophyAction, setTrophyPrizeAction } from "@/app/actions/trophies";
import { formatMoney, parseMoneyInput } from "@/lib/format/money";
import { TROPHIES } from "@/constants";
import { cn } from "@/lib/utils";
import type { TeamTrophyCabinet, TrophyCounts, TrophyType } from "@/types";

const CARD = "relative overflow-hidden border border-white/[0.08] bg-card/60 backdrop-blur-md shadow-xs";

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
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(
    () => sortCabinets(initialCabinets)[0]?.team.id ?? null,
  );
  const [pending, startTransition] = useTransition();

  const ranking = useMemo(() => sortCabinets(cabinets), [cabinets]);
  const selected = cabinets.find((c) => c.team.id === selectedId) ?? ranking[0];

  if (!selected) {
    return <p className="text-sm text-muted-foreground">No hay equipos en la liga todavía.</p>;
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
          setNotice(`${formatMoney(res.budgetDelta)} descontados del presupuesto de ${teamName}`);
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
      setError(err instanceof Error ? err.message : "No se pudo guardar el valor");
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de club */}
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
                  "flex shrink-0 items-center gap-2 rounded-xl border py-1 pl-1 pr-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-white/[0.08] bg-card/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <TeamLogo
                  name={c.team.name}
                  logoUrl={c.team.logo_url}
                  color={c.team.primary_color}
                  size="sm"
                />
                {c.team.short_name || c.team.name}
                <span
                  className={cn(
                    "rounded-md px-1.5 text-[11px] font-bold tabular-nums",
                    active ? "bg-primary/20 text-primary" : "bg-white/[0.06]",
                  )}
                >
                  {c.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vitrina del club */}
      <Card className={CARD}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <TeamLogo
              name={selected.team.name}
              logoUrl={selected.team.logo_url}
              color={selected.team.primary_color}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate font-display text-lg font-bold tracking-tight">
                {selected.team.name}
              </CardTitle>
              <CardDescription className="mt-0.5 flex items-center gap-1.5 text-xs">
                <Wallet className="size-3.5 text-primary" aria-hidden="true" />
                <span className="tabular-nums">{formatMoney(selected.team.budget)}</span>
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Trophy className="size-3" />
              {selected.total} {selected.total === 1 ? "título" : "títulos"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TROPHIES.map((t) => {
              const count = selected.trophies[t.key];
              return (
                <div
                  key={t.key}
                  className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 pb-3 pt-4"
                >
                  <PixelTrophy
                    type={t.key}
                    dimmed={count === 0}
                    title={t.label}
                    className="h-24 w-auto sm:h-28"
                  />
                  <p className="mt-3 text-xs font-medium text-muted-foreground">{t.label}</p>
                  <p
                    className={cn(
                      "font-display text-2xl font-bold tabular-nums",
                      count === 0 && "text-muted-foreground/50",
                    )}
                  >
                    {count}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gestión manual */}
      <Card className={CARD}>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="font-display text-lg font-bold tracking-tight">
            Gestión de títulos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Al sumar un título, su valor se añade al presupuesto del club. Si lo quitas, se descuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs font-medium text-muted-foreground">Club</span>
            <NativeSelect
              value={selected.team.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full sm:max-w-xs"
              aria-label="Club"
            >
              {ranking.map((c) => (
                <NativeSelectOption key={c.team.id} value={c.team.id}>
                  {c.team.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>

          <ul className="divide-y divide-border/50 rounded-xl border border-white/[0.08]">
            {TROPHIES.map((t) => {
              const count = selected.trophies[t.key];
              const prize = prizes[t.key];
              return (
                <li key={t.key} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex w-8 shrink-0 justify-center">
                    <PixelTrophy type={t.key} dimmed={count === 0} className="h-9 w-auto" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {prize > 0 ? `+${compactMoney(prize)} por título` : "Sin valor asignado"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Quitar un título de ${t.label}`}
                    onClick={() => changeCount(t.key, -1)}
                    disabled={pending || count === 0}
                  >
                    <Minus />
                  </Button>
                  <span className="w-7 text-center font-display text-lg font-bold tabular-nums">
                    {count}
                  </span>
                  <Button
                    size="sm"
                    aria-label={`Sumar un título de ${t.label}`}
                    onClick={() => changeCount(t.key, 1)}
                    disabled={pending}
                  >
                    <Plus />
                    <span className="hidden sm:inline">Sumar</span>
                  </Button>
                </li>
              );
            })}
          </ul>

          {pending && <p className="text-xs text-primary animate-pulse">Guardando…</p>}
          {notice && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3 border-t border-border/50 pt-4">
            <div>
              <p className="text-sm font-semibold">Valor de cada título</p>
              <p className="text-xs text-muted-foreground">
                Se guarda al salir del campo. Admite «25000000», «25.000.000» o «25M».
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TROPHIES.map((t) => (
                <PrizeField
                  key={`${t.key}-${prizes[t.key]}`}
                  label={t.label}
                  value={prizes[t.key]}
                  onSave={(v) => savePrize(t.key, v)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Palmarés */}
      <Card className={CARD}>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="font-display text-lg font-bold tracking-tight">Palmarés</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <div className="grid grid-cols-[1.5rem_1fr_repeat(4,1.75rem)_2rem] items-center gap-x-1.5 border-b border-border/50 px-4 py-2 text-[11px] text-muted-foreground sm:grid-cols-[2rem_1fr_repeat(4,3rem)_3rem]">
            <span>#</span>
            <span>Club</span>
            {TROPHIES.map((t) => (
              <span key={t.key} className="flex justify-center">
                <PixelTrophy type={t.key} title={t.label} className="h-5 w-auto" />
              </span>
            ))}
            <span className="text-right">Total</span>
          </div>
          <ul>
            {ranking.map((c, idx) => {
              const active = c.team.id === selected.team.id;
              return (
                <li key={c.team.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(c.team.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "grid w-full grid-cols-[1.5rem_1fr_repeat(4,1.75rem)_2rem] items-center gap-x-1.5 px-4 py-2 text-left transition-colors hover:bg-white/[0.03] sm:grid-cols-[2rem_1fr_repeat(4,3rem)_3rem]",
                      active && "bg-primary/[0.07]",
                    )}
                  >
                    <span className="font-display text-sm tabular-nums text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamLogo
                        name={c.team.name}
                        logoUrl={c.team.logo_url}
                        color={c.team.primary_color}
                        size="sm"
                      />
                      <span className="truncate text-sm font-medium">{c.team.name}</span>
                    </span>
                    {TROPHIES.map((t) => (
                      <span
                        key={t.key}
                        className={cn(
                          "text-center text-sm tabular-nums",
                          !c.trophies[t.key] && "text-muted-foreground/40",
                        )}
                      >
                        {c.trophies[t.key]}
                      </span>
                    ))}
                    <span className="text-right font-display text-sm font-bold tabular-nums">
                      {c.total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        inputMode="numeric"
        value={draft}
        placeholder="0"
        aria-invalid={invalid || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-10 border-white/[0.08] bg-card/60 tabular-nums"
      />
      <span className={cn("text-[11px] tabular-nums", invalid ? "text-destructive" : "text-muted-foreground")}>
        {invalid ? "Cantidad no válida" : formatMoney(value)}
      </span>
    </label>
  );
}
