"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Swords, Check, ArrowRightLeft } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { recordDirectMatchClient } from "@/lib/data/mutations";
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
  const [homeGoals, setHomeGoals] = useState<string>("");
  const [awayGoals, setAwayGoals] = useState<string>("");
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

  // Invertir local y visitante
  function swapTeams() {
    const prevHome = homeTeamId;
    setHomeTeamId(awayTeamId);
    setAwayTeamId(prevHome);
    setHomeGoals(awayGoals);
    setAwayGoals(homeGoals);
  }

  async function handleSave() {
    setError(null);
    if (!homeTeamId || !awayTeamId) {
      setError("Selecciona ambos equipos.");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError("Un equipo no puede jugar contra sí mismo.");
      return;
    }

    const hg = parseInt(homeGoals, 10);
    const ag = parseInt(awayGoals, 10);

    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      setError("Introduce un marcador válido (≥ 0).");
      return;
    }

    try {
      setLoading(true);
      await recordDirectMatchClient(
        leagueId,
        homeTeamId,
        awayTeamId,
        hg,
        ag,
      );
      setOpen(false);
      setHomeGoals("");
      setAwayGoals("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el partido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-medium shadow-sm">
          <Swords className="size-4" />
          Registrar Partido
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Swords className="size-5 text-primary" />
            Jugar Partido Libre
          </DialogTitle>
          <DialogDescription>
            Elige los dos equipos que juegan hoy y registra el resultado del partido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Selector de equipos */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto,1fr] sm:items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Local
              </label>
              <Select value={homeTeamId} onValueChange={setHomeTeamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar local" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      disabled={t.id === awayTeamId}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: t.primary_color }}
                        />
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={swapTeams}
                disabled={!homeTeamId && !awayTeamId}
                title="Invertir local y visitante"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowRightLeft className="size-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Visitante
              </label>
              <Select value={awayTeamId} onValueChange={setAwayTeamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar visitante" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      disabled={t.id === homeTeamId}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: t.primary_color }}
                        />
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estado de enfrentamientos previos */}
          {homeTeamId && awayTeamId && homeTeamId !== awayTeamId && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Enfrentamientos en liga:</span>
                {pendingMatches.length > 0 ? (
                  <Badge variant="secondary" className="text-[11px]">
                    {pendingMatches.length} pendiente(s)
                  </Badge>
                ) : playedMatches.length > 0 ? (
                  <Badge variant="outline" className="text-[11px] text-primary">
                    Ambos jugados
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px]">
                    Sin fixture previo
                  </Badge>
                )}
              </div>

              {playedMatches.length > 0 && (
                <div className="mt-2 space-y-1 text-muted-foreground">
                  {playedMatches.map((m) => (
                    <div key={m.id} className="flex justify-between">
                      <span>
                        J{m.matchday} ({m.home_team.short_name} vs {m.away_team.short_name}):
                      </span>
                      <span className="font-semibold text-foreground">
                        {m.home_goals} - {m.away_goals}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Marcador */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Marcador Final
            </label>
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 text-right">
                <p className="truncate text-sm font-medium">
                  {homeTeam ? (homeTeam.short_name || homeTeam.name) : "Local"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={homeGoals}
                  onChange={(e) => setHomeGoals(e.target.value)}
                  className="w-14 text-center font-display text-lg font-bold"
                />
                <span className="text-lg font-semibold text-muted-foreground">–</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={awayGoals}
                  onChange={(e) => setAwayGoals(e.target.value)}
                  className="w-14 text-center font-display text-lg font-bold"
                />
              </div>

              <div className="flex-1 text-left">
                <p className="truncate text-sm font-medium">
                  {awayTeam ? (awayTeam.short_name || awayTeam.name) : "Visitante"}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-center text-xs font-medium text-destructive">{error}</p>
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
            onClick={handleSave}
            disabled={loading || !homeTeamId || !awayTeamId}
            className="gap-1.5"
          >
            <Check className="size-4" />
            {loading ? "Guardando..." : "Confirmar Resultado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
