"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Swords,
  Check,
  ArrowRightLeft,
  Plus,
  Minus,
  Trophy,
  Sparkles,
  Search,
  X,
  Coins,
  History,
} from "lucide-react";
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

const QUICK_GOALS = [0, 1, 2, 3, 4, 5];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  // Filtrado de equipos por buscador
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase().trim();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.short_name && t.short_name.toLowerCase().includes(q)),
    );
  }, [teams, searchQuery]);

  // Historial H2H y partidos entre ambos clubes
  const relatedMatches = useMemo(() => {
    if (!homeTeamId || !awayTeamId) return [];
    return matches.filter(
      (m) =>
        (m.home_team_id === homeTeamId && m.away_team_id === awayTeamId) ||
        (m.home_team_id === awayTeamId && m.away_team_id === homeTeamId),
    );
  }, [matches, homeTeamId, awayTeamId]);

  const playedMatches = useMemo(() => relatedMatches.filter((m) => m.played), [relatedMatches]);
  const pendingMatches = useMemo(() => relatedMatches.filter((m) => !m.played), [relatedMatches]);

  const h2hStats = useMemo(() => {
    if (!homeTeamId || !awayTeamId) return null;
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;

    for (const m of playedMatches) {
      if (m.home_goals == null || m.away_goals == null) continue;
      const hScore = m.home_team_id === homeTeamId ? m.home_goals : m.away_goals;
      const aScore = m.home_team_id === homeTeamId ? m.away_goals : m.home_goals;
      if (hScore > aScore) homeWins++;
      else if (aScore > hScore) awayWins++;
      else draws++;
    }

    return { homeWins, awayWins, draws };
  }, [homeTeamId, awayTeamId, playedMatches]);

  function resetSelection() {
    setHomeTeamId("");
    setAwayTeamId("");
    setHomeGoals(0);
    setAwayGoals(0);
    setSearchQuery("");
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
      setError("Debes seleccionar ambos equipos para registrar el enfrentamiento.");
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
      setError(
        err instanceof Error ? err.message : "Error al registrar el resultado.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && homeTeamId && awayTeamId && !loading) {
      e.preventDefault();
      handleSave();
    }
  }

  const homeColor = homeTeam?.primary_color || "#3b82f6";
  const awayColor = awayTeam?.primary_color || "#ef4444";

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetSelection();
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="gap-2.5 font-display text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 sm:text-base"
        >
          <Swords className="size-5 text-primary-foreground" />
          Registrar Partido
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-xl border-white/[0.1] bg-card/95 backdrop-blur-xl p-5 sm:p-6"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/25">
              <Swords className="size-4" />
            </span>
            <DialogTitle className="font-display text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Arena de Enfrentamientos
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Selecciona los dos clubes, consulta su historial cara a cara y anota el marcador final.
          </DialogDescription>
        </DialogHeader>

        {/* 1. ESPORTS VS ARENA SHOWCASE */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-black/60 p-4 shadow-xl">
          {/* Dual team ambient glows */}
          {homeTeam && (
            <div
              className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-30 transition-opacity"
              style={{ backgroundColor: homeColor }}
            />
          )}
          {awayTeam && (
            <div
              className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full blur-2xl opacity-30 transition-opacity"
              style={{ backgroundColor: awayColor }}
            />
          )}

          <div className="relative z-10 grid grid-cols-[1fr,auto,1fr] items-center gap-3 text-center">
            {/* LOCAL */}
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-xl p-3 transition-all min-h-[110px]",
                homeTeam
                  ? "bg-white/[0.04] ring-1 ring-white/[0.15] shadow-inner"
                  : "border-2 border-dashed border-white/[0.1] bg-white/[0.01]",
              )}
            >
              <span className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
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
                  <p className="mt-2 font-display text-xs sm:text-sm font-black text-foreground truncate max-w-[130px]">
                    {homeTeam.short_name || homeTeam.name}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <div className="flex size-10 items-center justify-center rounded-full bg-white/[0.05] text-xs font-bold text-muted-foreground/60">
                    ?
                  </div>
                  <span className="text-[11px] font-medium">Elige local</span>
                </div>
              )}
            </div>

            {/* VS & SWAP */}
            <div className="flex flex-col items-center gap-2">
              <span className="font-display text-xl sm:text-2xl font-black tracking-widest text-primary/80 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                VS
              </span>
              {homeTeam && awayTeam && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={swapTeams}
                  title="Invertir condición de local y visitante"
                  className="rounded-full border-white/[0.15] bg-white/[0.05] hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:rotate-180"
                >
                  <ArrowRightLeft className="size-3.5" />
                </Button>
              )}
            </div>

            {/* VISITANTE */}
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-xl p-3 transition-all min-h-[110px]",
                awayTeam
                  ? "bg-white/[0.04] ring-1 ring-white/[0.15] shadow-inner"
                  : "border-2 border-dashed border-white/[0.1] bg-white/[0.01]",
              )}
            >
              <span className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
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
                  <p className="mt-2 font-display text-xs sm:text-sm font-black text-foreground truncate max-w-[130px]">
                    {awayTeam.short_name || awayTeam.name}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <div className="flex size-10 items-center justify-center rounded-full bg-white/[0.05] text-xs font-bold text-muted-foreground/60">
                    ?
                  </div>
                  <span className="text-[11px] font-medium">Elige visitante</span>
                </div>
              )}
            </div>
          </div>

          {/* HISTORIAL CARA A CARA (H2H) */}
          {homeTeam && awayTeam && (
            <div className="relative z-10 mt-3 border-t border-white/[0.08] pt-2.5 text-center text-xs">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {pendingMatches.length > 0 ? (
                  <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/25 font-bold text-[11px]">
                    <Sparkles className="size-3" />
                    {pendingMatches.length} partido(s) oficial(es) pendiente(s) en calendario
                  </Badge>
                ) : playedMatches.length > 0 ? (
                  <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold text-[11px]">
                    <Trophy className="size-3" />
                    Ya disputaron ida y vuelta ({playedMatches.map((m) => `${m.home_goals}-${m.away_goals}`).join(", ")})
                  </Badge>
                ) : null}

                {h2hStats && playedMatches.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Histórico directo: <strong>{h2hStats.homeWins}V</strong> {homeTeam.short_name || homeTeam.name} · <strong>{h2hStats.draws}E</strong> · <strong>{h2hStats.awayWins}V</strong> {awayTeam.short_name || awayTeam.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. BUSCADOR & SELECTOR DE EQUIPOS */}
        <div className="space-y-3.5">
          {/* Barra de búsqueda rápida */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar club por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* SELECCIÓN LOCAL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  1. Equipo Local
                </span>
                {homeTeam && (
                  <span className="font-bold text-primary text-[11px] truncate max-w-[120px]">
                    ✓ {homeTeam.short_name || homeTeam.name}
                  </span>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-white/[0.08] bg-black/20 p-1.5">
                {filteredTeams.map((t) => {
                  const isSelected = t.id === homeTeamId;
                  const isOpponent = t.id === awayTeamId;
                  return (
                    <button
                      key={`home-select-${t.id}`}
                      type="button"
                      disabled={isOpponent}
                      onClick={() => {
                        setHomeTeamId(t.id);
                        if (awayTeamId === t.id) setAwayTeamId("");
                      }}
                      className={cn(
                        "flex w-full min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : isOpponent
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-white/[0.06] text-foreground",
                      )}
                    >
                      <TeamLogo
                        name={t.name}
                        logoUrl={t.logo_url}
                        color={t.primary_color}
                        size="sm"
                      />
                      <span className="truncate flex-1">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECCIÓN VISITANTE */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  2. Equipo Visitante
                </span>
                {awayTeam && (
                  <span className="font-bold text-primary text-[11px] truncate max-w-[120px]">
                    ✓ {awayTeam.short_name || awayTeam.name}
                  </span>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-white/[0.08] bg-black/20 p-1.5">
                {filteredTeams.map((t) => {
                  const isSelected = t.id === awayTeamId;
                  const isOpponent = t.id === homeTeamId;
                  return (
                    <button
                      key={`away-select-${t.id}`}
                      type="button"
                      disabled={isOpponent}
                      onClick={() => {
                        setAwayTeamId(t.id);
                        if (homeTeamId === t.id) setHomeTeamId("");
                      }}
                      className={cn(
                        "flex w-full min-h-[38px] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : isOpponent
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-white/[0.06] text-foreground",
                      )}
                    >
                      <TeamLogo
                        name={t.name}
                        logoUrl={t.logo_url}
                        color={t.primary_color}
                        size="sm"
                      />
                      <span className="truncate flex-1">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. MARCADOR ERGONÓMICO CON BOTONES GRANDES & INPUTS */}
          {homeTeam && awayTeam && (
            <div className="rounded-2xl border border-white/[0.1] bg-black/40 p-4 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                  <Coins className="size-3 text-amber-400" /> 3. Marcador del Encuentro
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Premio: +3M€ victoria · +1M€ empate
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* LOCAL */}
                <div
                  className="flex flex-col items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                  style={{ borderTop: `3px solid ${homeColor}` }}
                >
                  <span className="truncate text-xs font-bold text-foreground mb-2">
                    {homeTeam.short_name || homeTeam.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Restar gol local"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all"
                      onClick={() => setHomeGoals((g) => Math.max(0, g - 1))}
                    >
                      <Minus className="size-4" />
                    </button>

                    <input
                      type="number"
                      min={0}
                      max={99}
                      aria-label="Goles local"
                      value={homeGoals}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setHomeGoals(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      className="w-14 rounded-xl border border-white/[0.15] bg-black/60 py-1.5 text-center font-display text-2xl font-black tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      aria-label="Sumar gol local"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all"
                      onClick={() => setHomeGoals((g) => g + 1)}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1">
                    {QUICK_GOALS.map((q) => (
                      <button
                        key={`modal-h-q-${q}`}
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

                {/* VISITANTE */}
                <div
                  className="flex flex-col items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                  style={{ borderTop: `3px solid ${awayColor}` }}
                >
                  <span className="truncate text-xs font-bold text-foreground mb-2">
                    {awayTeam.short_name || awayTeam.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Restar gol visitante"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all"
                      onClick={() => setAwayGoals((g) => Math.max(0, g - 1))}
                    >
                      <Minus className="size-4" />
                    </button>

                    <input
                      type="number"
                      min={0}
                      max={99}
                      aria-label="Goles visitante"
                      value={awayGoals}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setAwayGoals(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      className="w-14 rounded-xl border border-white/[0.15] bg-black/60 py-1.5 text-center font-display text-2xl font-black tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      aria-label="Sumar gol visitante"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-foreground hover:bg-white/[0.12] active:scale-95 transition-all"
                      onClick={() => setAwayGoals((g) => g + 1)}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1">
                    {QUICK_GOALS.map((q) => (
                      <button
                        key={`modal-a-q-${q}`}
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
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-center text-xs font-semibold text-rose-400">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-white/[0.08]">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
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
            className="min-h-[44px] gap-2 font-display font-bold shadow-lg shadow-primary/25"
          >
            <Check className="size-5" />
            {loading ? "Guardando en el acta..." : "Confirmar y Guardar Marcador"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
