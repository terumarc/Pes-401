"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Pencil,
  RotateCcw,
  Plus,
  Minus,
  X,
  Trophy,
  Swords,
  Coins,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/teams/TeamCard";
import { Badge } from "@/components/ui/badge";
import {
  recordMatchResultClient,
  resetMatchResultClient,
} from "@/lib/data/mutations";
import { cn } from "@/lib/utils";
import type { MatchWithTeams } from "@/types";

type MatchRowProps = {
  match: MatchWithTeams;
  reverseMatch?: MatchWithTeams | null;
  compact?: boolean;
};

const QUICK_GOALS = [0, 1, 2, 3, 4, 5];

export function MatchRow({ match, reverseMatch, compact = false }: MatchRowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [homeGoals, setHomeGoals] = useState<number>(match.home_goals ?? 0);
  const [awayGoals, setAwayGoals] = useState<number>(match.away_goals ?? 0);
  const [saving, setSaving] = useState(false);
  const homeInputRef = useRef<HTMLInputElement>(null);

  // Focus home score input when entering edit mode
  useEffect(() => {
    if (editing) {
      setTimeout(() => homeInputRef.current?.select(), 50);
    }
  }, [editing]);

  async function handleSave() {
    setSaving(true);
    try {
      await recordMatchResultClient(match.id, homeGoals, awayGoals);
      setEditing(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("¿Borrar el resultado de este partido y devolverlo a estado pendiente?")) return;
    await resetMatchResultClient(match.id);
    setHomeGoals(0);
    setAwayGoals(0);
    setEditing(false);
    startTransition(() => router.refresh());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setHomeGoals(match.home_goals ?? 0);
      setAwayGoals(match.away_goals ?? 0);
      setEditing(false);
    }
  }

  const isHomeWinner =
    match.played && (match.home_goals ?? 0) > (match.away_goals ?? 0);
  const isAwayWinner =
    match.played && (match.away_goals ?? 0) > (match.home_goals ?? 0);
  const isDraw =
    match.played && (match.home_goals ?? 0) === (match.away_goals ?? 0);

  // Cómputo global si es partido de vuelta y la ida se jugó
  let aggregateHome: number | null = null;
  let aggregateAway: number | null = null;
  if (match.round === 2 && reverseMatch?.played) {
    // En la ida, match.home_team jugó como visitante (away)
    const idaHomeGoals = reverseMatch.away_goals ?? 0; // goles del equipo que hoy es local
    const idaAwayGoals = reverseMatch.home_goals ?? 0; // goles del equipo que hoy es visitante
    if (match.played) {
      aggregateHome = (match.home_goals ?? 0) + idaHomeGoals;
      aggregateAway = (match.away_goals ?? 0) + idaAwayGoals;
    }
  }

  const homeColor = match.home_team.primary_color || "#3b82f6";
  const awayColor = match.away_team.primary_color || "#ef4444";

  /* =========================================================================
     MODO COMPACTO (Lista rápida)
     ========================================================================= */
  if (compact) {
    return (
      <div
        className={cn(
          "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden rounded-xl border p-3 transition-all",
          match.played
            ? "border-white/[0.08] bg-card/60 hover:border-white/[0.18]"
            : "border-dashed border-white/[0.1] bg-card/30 hover:border-primary/40",
        )}
      >
        {/* Glow lateral según ganador */}
        {match.played && (
          <div
            className="pointer-events-none absolute inset-0 opacity-10 transition-opacity group-hover:opacity-15"
            style={{
              background: `linear-gradient(90deg, ${homeColor} 0%, transparent 40%, transparent 60%, ${awayColor} 100%)`,
            }}
          />
        )}

        {/* Info cabecera */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5">
            J.{match.matchday}
          </span>
          <span>{match.round === 2 ? "Vuelta" : "Ida"}</span>
        </div>

        {/* Duelo / Marcador */}
        <div className="flex flex-1 items-center justify-center gap-4">
          <div className="flex flex-1 items-center justify-end gap-2 text-right min-w-0">
            <span
              className={cn(
                "truncate text-xs sm:text-sm font-bold",
                isHomeWinner ? "text-emerald-400 font-extrabold" : "text-foreground",
              )}
            >
              {match.home_team.short_name || match.home_team.name}
            </span>
            <TeamLogo
              name={match.home_team.name}
              logoUrl={match.home_team.logo_url}
              color={match.home_team.primary_color}
              size="sm"
            />
          </div>

          <div className="shrink-0 flex items-center justify-center">
            {match.played ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-black/40 px-2.5 py-1 font-display font-black text-sm tabular-nums">
                <span className={isHomeWinner ? "text-emerald-400" : "text-foreground"}>
                  {match.home_goals}
                </span>
                <span className="text-muted-foreground/60">–</span>
                <span className={isAwayWinner ? "text-emerald-400" : "text-foreground"}>
                  {match.away_goals}
                </span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="h-7 px-2.5 text-xs font-bold gap-1 border-white/[0.1] bg-white/[0.02] hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <Pencil className="size-3" />
                Anotar
              </Button>
            )}
          </div>

          <div className="flex flex-1 items-center gap-2 text-left min-w-0">
            <TeamLogo
              name={match.away_team.name}
              logoUrl={match.away_team.logo_url}
              color={match.away_team.primary_color}
              size="sm"
            />
            <span
              className={cn(
                "truncate text-xs sm:text-sm font-bold",
                isAwayWinner ? "text-emerald-400 font-extrabold" : "text-foreground",
              )}
            >
              {match.away_team.short_name || match.away_team.name}
            </span>
          </div>
        </div>

        {/* Acciones si está jugado */}
        {match.played && (
          <div className="flex items-center justify-end gap-1 shrink-0">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => setEditing(true)}
              title="Editar resultado"
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={handleReset}
              title="Borrar resultado"
              className="text-muted-foreground hover:text-rose-400"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================================
     MODO ESTÁNDAR — TARJETA ESPORTS / GAMING
     ========================================================================= */
  return (
    <div
      role="region"
      aria-label={`Partido Jornada ${match.matchday}: ${match.home_team.name} contra ${match.away_team.name}`}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300",
        match.played
          ? "border-white/[0.1] bg-card/75 shadow-lg shadow-black/25 hover:border-white/[0.22] hover:-translate-y-0.5"
          : "border-dashed border-white/[0.12] bg-card/40 hover:border-primary/50 hover:bg-card/60",
      )}
    >
      {/* 1. Dynamic Esports Club Glow (Gradiente ambiental perimetral sutil) */}
      <div
        className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-30"
        style={{ backgroundColor: homeColor }}
      />
      <div
        className="pointer-events-none absolute -right-12 -bottom-12 h-36 w-36 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-30"
        style={{ backgroundColor: awayColor }}
      />

      {/* Sheen superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />

      {/* 2. CABECERA ESPORTS: JORNADA, FASE, BOTÍN Y ESTADO */}
      <div className="relative z-10 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Tag de Jornada & Ronda */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            <span className="rounded-md border border-white/[0.1] bg-black/40 px-2 py-0.5 font-display text-foreground shadow-xs">
              J.{match.matchday}
            </span>
            <span className="text-white/40">·</span>
            <span className="text-[10px]">
              {match.round === 2 ? "Fase Vuelta" : "Fase Ida"}
            </span>
          </div>

          {/* Recompensa y Estado del Partido */}
          <div className="flex items-center gap-1.5">
            {/* Stakes / Premio */}
            <span
              title="Premio de liga: +3M€ victoria / +1M€ empate"
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300/90"
            >
              <Coins className="size-3 text-amber-400" />
              +3.0M€
            </span>

            {/* Badge de Estado */}
            {match.played ? (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-2 text-[10px] font-bold uppercase tracking-wider",
                  isDraw
                    ? "border-white/[0.15] bg-white/[0.05] text-muted-foreground"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]",
                )}
              >
                {isDraw ? "Empate" : "Finalizado"}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-white/[0.05] border border-white/[0.08]"
              >
                Pendiente
              </Badge>
            )}
          </div>
        </div>

        {/* Contexto de Ida / Vuelta & Marcador Global */}
        {match.round === 2 && reverseMatch && (
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/80 border-t border-white/[0.04] pt-1">
            <span className="flex items-center gap-1">
              <History className="size-3 text-primary/70" />
              <span>Ida:</span>
              <strong className="text-foreground">
                {reverseMatch.home_team.short_name || reverseMatch.home_team.name}{" "}
                {reverseMatch.home_goals ?? 0} - {reverseMatch.away_goals ?? 0}{" "}
                {reverseMatch.away_team.short_name || reverseMatch.away_team.name}
              </strong>
            </span>

            {aggregateHome !== null && aggregateAway !== null && (
              <span className="font-semibold text-primary">
                Global: {aggregateHome} – {aggregateAway}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. CONTENIDO: MODO EDICIÓN VS MODO SCOREBOARD ARENA */}
      <div className="relative z-10 p-4">
        {editing ? (
          /* MODO EDICIÓN ERGONÓMICO & ACCESIBLE (Touch targets >= 44px + Teclado) */
          <div
            className="space-y-4"
            onKeyDown={handleKeyDown}
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* LOCAL COUNTER */}
              <div
                className="flex flex-col items-center rounded-xl border border-white/[0.1] bg-black/40 p-3 shadow-inner"
                style={{ borderTop: `3px solid ${homeColor}` }}
              >
                <div className="flex items-center gap-2 mb-2 min-w-0 max-w-full">
                  <TeamLogo
                    name={match.home_team.name}
                    logoUrl={match.home_team.logo_url}
                    color={match.home_team.primary_color}
                    size="sm"
                  />
                  <span className="truncate text-xs font-bold text-foreground">
                    {match.home_team.short_name || match.home_team.name}
                  </span>
                </div>

                {/* Control +/- con Input numérico directo */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Restar gol a ${match.home_team.name}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setHomeGoals((g) => Math.max(0, g - 1))}
                  >
                    <Minus className="size-4" />
                  </button>

                  <input
                    ref={homeInputRef}
                    type="number"
                    min={0}
                    max={99}
                    aria-label={`Goles de ${match.home_team.name}`}
                    value={homeGoals}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setHomeGoals(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-14 rounded-xl border border-white/[0.15] bg-black/60 py-1.5 text-center font-display text-2xl font-black tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    aria-label={`Sumar gol a ${match.home_team.name}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setHomeGoals((g) => g + 1)}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Chips rápidos de goles */}
                <div className="mt-2.5 flex items-center gap-1">
                  {QUICK_GOALS.map((q) => (
                    <button
                      key={`home-q-${q}`}
                      type="button"
                      onClick={() => setHomeGoals(q)}
                      className={cn(
                        "size-6 rounded-md text-[11px] font-bold transition-all",
                        homeGoals === q
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* VISITANTE COUNTER */}
              <div
                className="flex flex-col items-center rounded-xl border border-white/[0.1] bg-black/40 p-3 shadow-inner"
                style={{ borderTop: `3px solid ${awayColor}` }}
              >
                <div className="flex items-center gap-2 mb-2 min-w-0 max-w-full">
                  <TeamLogo
                    name={match.away_team.name}
                    logoUrl={match.away_team.logo_url}
                    color={match.away_team.primary_color}
                    size="sm"
                  />
                  <span className="truncate text-xs font-bold text-foreground">
                    {match.away_team.short_name || match.away_team.name}
                  </span>
                </div>

                {/* Control +/- con Input numérico directo */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Restar gol a ${match.away_team.name}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setAwayGoals((g) => Math.max(0, g - 1))}
                  >
                    <Minus className="size-4" />
                  </button>

                  <input
                    type="number"
                    min={0}
                    max={99}
                    aria-label={`Goles de ${match.away_team.name}`}
                    value={awayGoals}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setAwayGoals(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-14 rounded-xl border border-white/[0.15] bg-black/60 py-1.5 text-center font-display text-2xl font-black tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    aria-label={`Sumar gol a ${match.away_team.name}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setAwayGoals((g) => g + 1)}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Chips rápidos de goles */}
                <div className="mt-2.5 flex items-center gap-1">
                  {QUICK_GOALS.map((q) => (
                    <button
                      key={`away-q-${q}`}
                      type="button"
                      onClick={() => setAwayGoals(q)}
                      className={cn(
                        "size-6 rounded-md text-[11px] font-bold transition-all",
                        awayGoals === q
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground",
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground">
              Pulsa <kbd className="rounded bg-white/[0.1] px-1 py-0.5 font-mono text-[9px]">Enter</kbd> para confirmar o <kbd className="rounded bg-white/[0.1] px-1 py-0.5 font-mono text-[9px]">Esc</kbd> para salir.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.06]">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-[40px] px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setHomeGoals(match.home_goals ?? 0);
                  setAwayGoals(match.away_goals ?? 0);
                  setEditing(false);
                }}
              >
                <X className="mr-1.5 size-3.5" />
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[40px] px-4 text-xs font-semibold shadow-md gap-1.5"
              >
                <Check className="size-4" />
                {saving ? "Guardando..." : "Confirmar Marcador"}
              </Button>
            </div>
          </div>
        ) : (
          /* MODO SCOREBOARD ARENA (Estilo Gaming / Torneo) */
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 sm:gap-3 py-1">
            {/* LOCAL */}
            <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
              <div className="min-w-0">
                <span
                  className={cn(
                    "block truncate font-display text-sm sm:text-base font-bold transition-colors",
                    isHomeWinner
                      ? "text-foreground font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                      : "text-foreground/80",
                  )}
                >
                  {match.home_team.short_name || match.home_team.name}
                </span>
                {isHomeWinner && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <Trophy className="size-2.5" /> Ganador
                  </span>
                )}
              </div>
              <div className="relative shrink-0">
                <TeamLogo
                  name={match.home_team.name}
                  logoUrl={match.home_team.logo_url}
                  color={match.home_team.primary_color}
                  size="md"
                />
                {isHomeWinner && (
                  <div
                    className="absolute -inset-1 rounded-full blur-xs opacity-40 -z-10"
                    style={{ backgroundColor: homeColor }}
                  />
                )}
              </div>
            </div>

            {/* MARCADOR O BOTÓN VS */}
            <div className="flex shrink-0 items-center justify-center px-1">
              {match.played ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.12] bg-black/60 px-4 py-2 shadow-2xl backdrop-blur-md">
                  <span
                    className={cn(
                      "font-display text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                      isHomeWinner
                        ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                        : "text-foreground/90",
                    )}
                  >
                    {match.home_goals}
                  </span>
                  <span className="font-display text-xs font-bold text-muted-foreground/60">
                    :
                  </span>
                  <span
                    className={cn(
                      "font-display text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                      isAwayWinner
                        ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                        : "text-foreground/90",
                    )}
                  >
                    {match.away_goals}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label={`Anotar resultado entre ${match.home_team.name} y ${match.away_team.name}`}
                  className="group/btn relative flex min-h-[44px] min-w-[72px] flex-col items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.03] px-3 py-1.5 transition-all hover:scale-105 hover:border-primary/60 hover:bg-primary/10 active:scale-95 shadow-sm"
                >
                  <span className="font-display text-xs font-black tracking-widest text-muted-foreground/80 group-hover/btn:text-primary transition-colors">
                    VS
                  </span>
                  <span className="text-[10px] font-semibold text-primary/80 group-hover/btn:text-primary flex items-center gap-1">
                    <Pencil className="size-2.5" /> Anotar
                  </span>
                </button>
              )}
            </div>

            {/* VISITANTE */}
            <div className="flex min-w-0 items-center gap-2.5 text-left">
              <div className="relative shrink-0">
                <TeamLogo
                  name={match.away_team.name}
                  logoUrl={match.away_team.logo_url}
                  color={match.away_team.primary_color}
                  size="md"
                />
                {isAwayWinner && (
                  <div
                    className="absolute -inset-1 rounded-full blur-xs opacity-40 -z-10"
                    style={{ backgroundColor: awayColor }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <span
                  className={cn(
                    "block truncate font-display text-sm sm:text-base font-bold transition-colors",
                    isAwayWinner
                      ? "text-foreground font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                      : "text-foreground/80",
                  )}
                >
                  {match.away_team.short_name || match.away_team.name}
                </span>
                {isAwayWinner && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <Trophy className="size-2.5" /> Ganador
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. PIE DE TARJETA CUANDO YA ESTÁ JUGADO */}
      {match.played && !editing && (
        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] bg-black/20 px-4 py-2 text-xs">
          <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[200px] sm:max-w-none">
            {isHomeWinner
              ? `Victoria de ${match.home_team.short_name || match.home_team.name} (+3.0M€)`
              : isAwayWinner
              ? `Victoria de ${match.away_team.short_name || match.away_team.name} (+3.0M€)`
              : "Reparto de puntos (+1.0M€ cada uno)"}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setHomeGoals(match.home_goals ?? 0);
                setAwayGoals(match.away_goals ?? 0);
                setEditing(true);
              }}
              title="Modificar resultado"
              className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              title="Borrar resultado del partido"
              className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-rose-400"
            >
              <RotateCcw className="size-3 mr-1" />
              Borrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
