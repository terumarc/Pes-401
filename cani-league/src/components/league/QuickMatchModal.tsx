"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Swords, Check, ArrowRightLeft, Plus, Minus, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/teams/TeamCard";
import { recordDirectMatchClient } from "@/lib/data/mutations";
import { cn } from "@/lib/utils";
import type { MatchWithTeams, Team } from "@/types";

type QuickMatchModalProps = {
  leagueId: string;
  teams: Team[];
  matches: MatchWithTeams[];
};

export function QuickMatchModal({
  leagueId,
  teams,
  matches,
}: QuickMatchModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [homeGoals, setHomeGoals] = useState<number>(0);
  const [awayGoals, setAwayGoals] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<"teams" | "score">("teams");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  // Historial y estado de enfrentamientos entre ambos equipos
  const relatedMatches =
    homeTeamId && awayTeamId
      ? matches.filter(
          (m) =>
            (m.home_team_id === homeTeamId && m.away_team_id === awayTeamId) ||
            (m.home_team_id === awayTeamId && m.away_team_id === homeTeamId),
        )
      : [];

  const playedMatches = relatedMatches.filter((m) => m.played);
  const pendingMatches = relatedMatches.filter((m) => !m.played);

  function resetSelection() {
    setHomeTeamId("");
    setAwayTeamId("");
    setHomeGoals(0);
    setAwayGoals(0);
    setActiveStep("teams");
    setError(null);
  }

  function swapTeams() {
    const prevHome = homeTeamId;
    setHomeTeamId(awayTeamId);
    setAwayTeamId(prevHome);
    const prevHg = homeGoals;
    setHomeGoals(awayGoals);
    setAwayGoals(prevHg);
  }

  async function handleSave() {
    setError(null);
    if (!homeTeamId || !awayTeamId) {
      setError("Debes seleccionar ambos equipos.");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError("Un equipo no puede jugar contra sí mismo.");
      return;
    }

    try {
      setLoading(true);
      await recordDirectMatchClient(
        leagueId,
        homeTeamId,
        awayTeamId,
        homeGoals,
        awayGoals,
      );
      setOpen(false);
      resetSelection();
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el resultado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetSelection();
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2.5 font-display text-sm font-semibold shadow-md sm:text-base">
          <Swords className="size-5" />
          Registrar Partido
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Swords className="size-6 text-primary" />
            Jugar Partido Libre
          </DialogTitle>
          <DialogDescription>
            Toca los equipos que juegan hoy y anota el marcador fácilmente.
          </DialogDescription>
        </DialogHeader>

        {/* 1. MATCHUP SCOREBOARD PREVIEW */}
        <div className="relative overflow-hidden rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3 text-center">
            {/* LOCAL */}
            <div
              className={cn(
                "flex flex-col items-center rounded-xl p-2.5 transition-all",
                homeTeam
                  ? "bg-primary/5 ring-2 ring-primary/30"
                  : "border-2 border-dashed border-muted-foreground/20",
              )}
            >
              <span className="mb-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                🏠 Local
              </span>
              {homeTeam ? (
                <>
                  <TeamLogo
                    name={homeTeam.name}
                    logoUrl={homeTeam.logo_url}
                    color={homeTeam.primary_color}
                    size="md"
                  />
                  <p className="mt-2 font-display text-sm font-bold tracking-tight">
                    {homeTeam.short_name || homeTeam.name}
                  </p>
                </>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 text-xs text-muted-foreground">
                  Elige
                </div>
              )}
            </div>

            {/* VS & SWAP */}
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-lg font-black tracking-widest text-muted-foreground/60">
                VS
              </span>
              {homeTeam && awayTeam && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={swapTeams}
                  title="Invertir local y visitante"
                  className="rounded-full"
                >
                  <ArrowRightLeft className="size-3" />
                </Button>
              )}
            </div>

            {/* VISITANTE */}
            <div
              className={cn(
                "flex flex-col items-center rounded-xl p-2.5 transition-all",
                awayTeam
                  ? "bg-primary/5 ring-2 ring-primary/30"
                  : "border-2 border-dashed border-muted-foreground/20",
              )}
            >
              <span className="mb-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                ✈️ Visitante
              </span>
              {awayTeam ? (
                <>
                  <TeamLogo
                    name={awayTeam.name}
                    logoUrl={awayTeam.logo_url}
                    color={awayTeam.primary_color}
                    size="md"
                  />
                  <p className="mt-2 font-display text-sm font-bold tracking-tight">
                    {awayTeam.short_name || awayTeam.name}
                  </p>
                </>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 text-xs text-muted-foreground">
                  Elige
                </div>
              )}
            </div>
          </div>

          {/* HISTORIAL PREVIO */}
          {homeTeam && awayTeam && (
            <div className="mt-3 border-t pt-2 text-center text-xs">
              {pendingMatches.length > 0 ? (
                <Badge variant="secondary" className="gap-1 font-medium">
                  <Sparkles className="size-3 text-primary" />
                  {pendingMatches.length} enfrentamiento(s) pendiente(s) en liga
                </Badge>
              ) : playedMatches.length > 0 ? (
                <Badge variant="outline" className="gap-1 text-primary">
                  <Trophy className="size-3" />
                  Ya jugaron ida y vuelta ({playedMatches.map((m) => `${m.home_goals}-${m.away_goals}`).join(", ")})
                </Badge>
              ) : null}
            </div>
          )}
        </div>

        {/* 2. SELECCION VISUAL DE EQUIPOS */}
        <div className="space-y-4">
          {/* SELECCIONAR LOCAL */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold tracking-wide text-foreground uppercase">
                1. Selecciona Equipo Local
              </label>
              {homeTeam && (
                <span className="text-xs font-semibold text-primary">
                  ✓ {homeTeam.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {teams.map((t) => {
                const isSelected = t.id === homeTeamId;
                const isOpponent = t.id === awayTeamId;
                return (
                  <button
                    key={`home-${t.id}`}
                    type="button"
                    disabled={isOpponent}
                    onClick={() => {
                      setHomeTeamId(t.id);
                      if (awayTeamId === t.id) setAwayTeamId("");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                        : isOpponent
                          ? "cursor-not-allowed opacity-30"
                          : "bg-muted/40 hover:bg-muted hover:border-foreground/20",
                    )}
                  >
                    <TeamLogo
                      name={t.name}
                      logoUrl={t.logo_url}
                      color={t.primary_color}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-xs font-bold">
                        {t.short_name || t.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELECCIONAR VISITANTE */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold tracking-wide text-foreground uppercase">
                2. Selecciona Equipo Visitante
              </label>
              {awayTeam && (
                <span className="text-xs font-semibold text-primary">
                  ✓ {awayTeam.name}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {teams.map((t) => {
                const isSelected = t.id === awayTeamId;
                const isOpponent = t.id === homeTeamId;
                return (
                  <button
                    key={`away-${t.id}`}
                    type="button"
                    disabled={isOpponent}
                    onClick={() => {
                      setAwayTeamId(t.id);
                      if (homeTeamId === t.id) setHomeTeamId("");
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40"
                        : isOpponent
                          ? "cursor-not-allowed opacity-30"
                          : "bg-muted/40 hover:bg-muted hover:border-foreground/20",
                    )}
                  >
                    <TeamLogo
                      name={t.name}
                      logoUrl={t.logo_url}
                      color={t.primary_color}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-xs font-bold">
                        {t.short_name || t.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. MARCADOR TACTIL CON BOTONES GRANDES +/- */}
          {homeTeam && awayTeam && (
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="mb-3 text-center text-xs font-bold tracking-wide text-muted-foreground uppercase">
                3. Introduce el resultado final
              </p>

              <div className="grid grid-cols-2 gap-6">
                {/* GOLES LOCAL */}
                <div className="flex flex-col items-center gap-2">
                  <span className="truncate text-xs font-bold text-foreground">
                    {homeTeam.short_name || homeTeam.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-full text-lg font-bold"
                      onClick={() => setHomeGoals((g) => Math.max(0, g - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-12 text-center font-display text-4xl font-extrabold tabular-nums">
                      {homeGoals}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-full text-lg font-bold"
                      onClick={() => setHomeGoals((g) => g + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* GOLES VISITANTE */}
                <div className="flex flex-col items-center gap-2">
                  <span className="truncate text-xs font-bold text-foreground">
                    {awayTeam.short_name || awayTeam.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-full text-lg font-bold"
                      onClick={() => setAwayGoals((g) => Math.max(0, g - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-12 text-center font-display text-4xl font-extrabold tabular-nums">
                      {awayGoals}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-full text-lg font-bold"
                      onClick={() => setAwayGoals((g) => g + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 p-2.5 text-center text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={handleSave}
            disabled={loading || !homeTeamId || !awayTeamId}
            className="gap-2 font-display font-semibold"
          >
            <Check className="size-5" />
            {loading ? "Guardando..." : "Confirmar Marcador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
