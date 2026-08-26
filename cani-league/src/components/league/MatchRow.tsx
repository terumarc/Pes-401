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
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card/70 p-3.5 shadow-sm transition-all hover:border-foreground/25 hover:shadow-md",
        match.played ? "border-border/80" : "border-dashed border-border/70",
      )}
    >
      {/* CABECERA / ESTADO */}
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-muted-foreground uppercase">
          <span>J{match.matchday}</span>
          <span>·</span>
          <span>{match.round === 2 ? "Vuelta" : "Ida"}</span>
        </div>

        <div>
          {match.played ? (
            <Badge
              variant="outline"
              className={cn(
                "h-5 text-[10px] font-bold",
                isDraw
                  ? "border-muted-foreground/30 text-muted-foreground"
                  : "border-primary/40 bg-primary/10 text-primary",
              )}
            >
              {isDraw ? "Empate" : "Finalizado"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="h-5 text-[10px] font-semibold text-muted-foreground">
              Pendiente
            </Badge>
          )}
        </div>
      </div>

      {/* CUERPO DEL PARTIDO */}
      {editing ? (
        /* MODO EDICIÓN TÁCTIL */
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            {/* LOCAL COUNTER */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/40 p-2">
              <div className="flex items-center gap-1.5">
                <TeamLogo
                  name={match.home_team.name}
                  logoUrl={match.home_team.logo_url}
                  color={match.home_team.primary_color}
                  size="sm"
                />
                <span className="truncate text-xs font-bold">
                  {match.home_team.short_name || match.home_team.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="rounded-full"
                  onClick={() => setHomeGoals((g) => Math.max(0, g - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-display text-2xl font-bold">
                  {homeGoals}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="rounded-full"
                  onClick={() => setHomeGoals((g) => g + 1)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            {/* VISITANTE COUNTER */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/40 p-2">
              <div className="flex items-center gap-1.5">
                <TeamLogo
                  name={match.away_team.name}
                  logoUrl={match.away_team.logo_url}
                  color={match.away_team.primary_color}
                  size="sm"
                />
                <span className="truncate text-xs font-bold">
                  {match.away_team.short_name || match.away_team.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="rounded-full"
                  onClick={() => setAwayGoals((g) => Math.max(0, g - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-display text-2xl font-bold">
                  {awayGoals}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  className="rounded-full"
                  onClick={() => setAwayGoals((g) => g + 1)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setHomeGoals(match.home_goals ?? 0);
                setAwayGoals(match.away_goals ?? 0);
                setEditing(false);
              }}
            >
              <X className="mr-1 size-3.5" />
              Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Check className="mr-1 size-3.5" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      ) : (
        /* MODO VISTA / SCOREBOARD */
        <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 py-1">
          {/* LOCAL */}
          <div className="flex min-w-0 items-center justify-end gap-2 text-right">
            <span
              className={cn(
                "truncate font-display text-sm font-bold",
                isHomeWinner ? "text-foreground" : "text-foreground/80",
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

          {/* SCORE */}
          <div className="flex shrink-0 items-center justify-center px-1">
            {match.played ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1">
                <span
                  className={cn(
                    "font-display text-lg font-extrabold tabular-nums",
                    isHomeWinner && "text-primary",
                  )}
                >
                  {match.home_goals}
                </span>
                <span className="text-xs font-bold text-muted-foreground">–</span>
                <span
                  className={cn(
                    "font-display text-lg font-extrabold tabular-nums",
                    isAwayWinner && "text-primary",
                  )}
                >
                  {match.away_goals}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="group/btn flex items-center gap-1 rounded-lg border border-dashed px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
              >
                <Pencil className="size-3 transition-transform group-hover/btn:scale-110" />
                Anotar
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
                "truncate font-display text-sm font-bold",
                isAwayWinner ? "text-foreground" : "text-foreground/80",
              )}
            >
              {match.away_team.short_name || match.away_team.name}
            </span>
          </div>
        </div>
      )}

      {/* FOOTER ACTIONS CUANDO ESTÁ JUGADO */}
      {match.played && !editing && (
        <div className="mt-2 flex items-center justify-end gap-1 border-t border-border/40 pt-1.5">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => {
              setHomeGoals(match.home_goals ?? 0);
              setAwayGoals(match.away_goals ?? 0);
              setEditing(true);
            }}
            title="Editar marcador"
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={reset}
            title="Borrar resultado"
            className="text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
