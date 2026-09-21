"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, RotateCcw, Plus, Minus, X } from "lucide-react";
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
};

export function MatchRow({ match }: MatchRowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [homeGoals, setHomeGoals] = useState<number>(match.home_goals ?? 0);
  const [awayGoals, setAwayGoals] = useState<number>(match.away_goals ?? 0);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await recordMatchResultClient(match.id, homeGoals, awayGoals);
      setEditing(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("¿Borrar el resultado de este partido?")) return;
    await resetMatchResultClient(match.id);
    setHomeGoals(0);
    setAwayGoals(0);
    startTransition(() => router.refresh());
  }

  const isHomeWinner =
    match.played && (match.home_goals ?? 0) > (match.away_goals ?? 0);
  const isAwayWinner =
    match.played && (match.away_goals ?? 0) > (match.home_goals ?? 0);
  const isDraw =
    match.played && (match.home_goals ?? 0) === (match.away_goals ?? 0);

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-md p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
        match.played
          ? "border-white/[0.08] hover:border-white/[0.18]"
          : "border-dashed border-white/[0.1] hover:border-white/[0.2] bg-card/40"
      )}
    >
      {/* Stripe top-edge sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />

      {/* CABECERA / ESTADO & JORNADA */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold tracking-wider text-muted-foreground uppercase text-[10px]">
          <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
            Jornada {match.matchday}
          </span>
          <span>·</span>
          <span>{match.round === 2 ? "Fase de Vuelta" : "Fase de Ida"}</span>
        </div>

        <div>
          {match.played ? (
            <Badge
              variant="outline"
              className={cn(
                "h-5 text-[10px] font-bold px-2",
                isDraw
                  ? "border-white/[0.12] bg-white/[0.04] text-muted-foreground"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xs"
              )}
            >
              {isDraw ? "Empate" : "Finalizado"}
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="h-5 text-[10px] font-semibold text-muted-foreground bg-white/[0.04] border border-white/[0.06]"
            >
              Pendiente
            </Badge>
          )}
        </div>
      </div>

      {/* CUERPO DEL PARTIDO */}
      {editing ? (
        /* MODO EDICIÓN TÁCTIL (Touch targets >= 44px) */
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            {/* LOCAL COUNTER */}
            <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 min-w-0">
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
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  aria-label="Restar gol a equipo local"
                  className="flex size-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-foreground hover:bg-white/[0.08] active:scale-95 transition-all"
                  onClick={() => setHomeGoals((g) => Math.max(0, g - 1))}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center font-display text-3xl font-extrabold tabular-nums text-foreground">
                  {homeGoals}
                </span>
                <button
                  type="button"
                  aria-label="Sumar gol a equipo local"
                  className="flex size-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-foreground hover:bg-white/[0.08] active:scale-95 transition-all"
                  onClick={() => setHomeGoals((g) => g + 1)}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* VISITANTE COUNTER */}
            <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 min-w-0">
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
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  aria-label="Restar gol a equipo visitante"
                  className="flex size-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-foreground hover:bg-white/[0.08] active:scale-95 transition-all"
                  onClick={() => setAwayGoals((g) => Math.max(0, g - 1))}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center font-display text-3xl font-extrabold tabular-nums text-foreground">
                  {awayGoals}
                </span>
                <button
                  type="button"
                  aria-label="Sumar gol a equipo visitante"
                  className="flex size-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-foreground hover:bg-white/[0.08] active:scale-95 transition-all"
                  onClick={() => setAwayGoals((g) => g + 1)}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
            <Button
              size="sm"
              variant="ghost"
              className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
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
              size="sm"
              onClick={save}
              disabled={saving}
              className="h-9 px-4 text-xs font-semibold"
            >
              <Check className="mr-1.5 size-3.5" />
              {saving ? "Guardando..." : "Confirmar Marcador"}
            </Button>
          </div>
        </div>
      ) : (
        /* MODO VISTA / SCOREBOARD */
        <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 sm:gap-4 py-2">
          {/* LOCAL */}
          <div className="flex min-w-0 items-center justify-end gap-2 text-right">
            <span
              className={cn(
                "truncate font-display text-sm sm:text-base font-bold transition-colors",
                isHomeWinner ? "text-foreground font-extrabold" : "text-foreground/80"
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

          {/* SCORE / CTA */}
          <div className="flex shrink-0 items-center justify-center px-1">
            {match.played ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 shadow-inner">
                <span
                  className={cn(
                    "font-display text-xl sm:text-2xl font-black tabular-nums",
                    isHomeWinner ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" : "text-foreground/90"
                  )}
                >
                  {match.home_goals}
                </span>
                <span className="text-xs font-bold text-muted-foreground/60">–</span>
                <span
                  className={cn(
                    "font-display text-xl sm:text-2xl font-black tabular-nums",
                    isAwayWinner ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" : "text-foreground/90"
                  )}
                >
                  {match.away_goals}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="group/btn flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.02] px-3 py-1.5 text-xs font-bold text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-95"
              >
                <Pencil className="size-3 transition-transform duration-200 group-hover/btn:scale-110" />
                <span>Anotar</span>
              </button>
            )}
          </div>

          {/* VISITANTE */}
          <div className="flex min-w-0 items-center gap-2 text-left">
            <TeamLogo
              name={match.away_team.name}
              logoUrl={match.away_team.logo_url}
              color={match.away_team.primary_color}
              size="sm"
            />
            <span
              className={cn(
                "truncate font-display text-sm sm:text-base font-bold transition-colors",
                isAwayWinner ? "text-foreground font-extrabold" : "text-foreground/80"
              )}
            >
              {match.away_team.short_name || match.away_team.name}
            </span>
          </div>
        </div>
      )}

      {/* FOOTER ACTIONS CUANDO ESTÁ JUGADO */}
      {match.played && !editing && (
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-xs">
          <span className="text-[11px] text-muted-foreground">
            {isHomeWinner
              ? `Victoria de ${match.home_team.short_name || match.home_team.name}`
              : isAwayWinner
              ? `Victoria de ${match.away_team.short_name || match.away_team.name}`
              : "Reparto de puntos"}
          </span>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setHomeGoals(match.home_goals ?? 0);
                setAwayGoals(match.away_goals ?? 0);
                setEditing(true);
              }}
              title="Editar marcador"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              title="Borrar resultado y volver a pendiente"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-rose-400"
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
