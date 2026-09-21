"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  Check,
  X,
  Wallet,
  TrendingUp,
  Search,
  ArrowUpDown,
  Coins,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";
import { BudgetComparisonChart } from "@/components/charts/LeagueCharts";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { TeamLogo } from "@/components/teams/TeamCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { updateTeamClient } from "@/lib/data/mutations";
import { getBudgetPercentage, formatMoney } from "@/lib/format/money";
import { calculatePositionReward } from "@/lib/economy";
import type { TeamWithStanding } from "@/types";

type FinancesPanelProps = {
  teams: TeamWithStanding[];
};

export function FinancesPanel({ teams }: FinancesPanelProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("budget_desc");
  const [showRules, setShowRules] = useState(false);

  const maxBudget = Math.max(...teams.map((t) => t.budget || 0), 1);
  const total = teams.reduce((sum, t) => sum + (t.budget || 0), 0);

  // Filtered & sorted teams
  const filteredTeams = useMemo(() => {
    const result = teams.filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.short_name && t.short_name.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      if (sortBy === "budget_desc") return (b.budget || 0) - (a.budget || 0);
      if (sortBy === "budget_asc") return (a.budget || 0) - (b.budget || 0);
      if (sortBy === "squad_value_desc") return (b.squad_value || 0) - (a.squad_value || 0);
      if (sortBy === "position_asc") return (a.position || 999) - (b.position || 999);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "es");
      return 0;
    });

    return result;
  }, [teams, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL RULES & LEAGUE PRIZES BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 p-4 sm:p-5 backdrop-blur-md shadow-xs">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
          aria-hidden="true"
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                Normativa Económica de la Competición
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">
                  Oficial
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reglamento de inyecciones financieras, primas de posición y ventas directas
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRules(!showRules)}
            aria-expanded={showRules}
            aria-controls="league-financial-rules-content"
            className="self-start sm:self-auto min-h-[36px] h-9 gap-1.5 text-xs font-semibold border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.06]"
          >
            <span>{showRules ? "Ocultar Detalles" : "Ver Normativa y Premios"}</span>
            {showRules ? (
              <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Core Rules Quick Summary Pills */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-3 border-t border-border/50 text-xs">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-muted/30 p-2.5">
            <span className="text-base" aria-hidden="true">🏆</span>
            <div>
              <span className="font-bold text-foreground block">Inyección por Posición</span>
              <span className="text-muted-foreground text-[11px]">
                1º = €25M · +€5M por puesto (ida y vuelta)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-muted/30 p-2.5">
            <span className="text-base" aria-hidden="true">⚡</span>
            <div>
              <span className="font-bold text-foreground block">Venta Directa al Mercado</span>
              <span className="text-muted-foreground text-[11px]">
                30% del valor ingresado al instante
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-muted/30 p-2.5">
            <span className="text-base" aria-hidden="true">🤝</span>
            <div>
              <span className="font-bold text-foreground block">Cláusulas de Rescisión</span>
              <span className="text-muted-foreground text-[11px]">
                100% abonado íntegro al club de origen
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Extended Table of Position Rewards */}
        {showRules && (
          <div
            id="league-financial-rules-content"
            className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 duration-200 space-y-3"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tabla de Inyecciones Económicas por Clasificación de la Liga
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {teams.map((_, idx) => {
                const pos = idx + 1;
                const reward = calculatePositionReward(pos);
                return (
                  <div
                    key={pos}
                    className="flex flex-col rounded-lg border border-white/[0.06] bg-background/50 p-2 text-center"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {pos}º Clasificado
                    </span>
                    <span className="font-display font-extrabold text-xs text-foreground mt-0.5 tabular-nums">
                      {formatMoney(reward)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              * Las inyecciones se aplican en dos ventanas: al término de la fase de ida (todos los partidos de la 1ª vuelta disputados) y al término de la competición regular.
            </p>
          </div>
        )}
      </div>

      {/* 2. BUDGET COMPARISON CHART CARD */}
      <Card className="relative overflow-hidden border border-white/[0.08] bg-card/60 backdrop-blur-md shadow-xs">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg font-bold tracking-tight">
                Comparativa de Presupuestos de la Liga
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5 text-muted-foreground">
                Distribución del límite salarial y capacidad financiera relativa entre los clubes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-muted/40 px-3.5 py-1.5 self-start sm:self-auto">
              <Wallet className="size-3.5 text-primary" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Total Liga:</span>
              <BudgetDisplay amount={total} size="sm" className="font-bold text-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <BudgetComparisonChart
            teams={teams.map((t) => ({
              name: t.name,
              short_name: t.short_name || t.name.slice(0, 3).toUpperCase(),
              budget: t.budget || 0,
              color: t.primary_color || "var(--primary)",
            }))}
          />
        </CardContent>
      </Card>

      {/* 3. TOOLBAR: SEARCH & SORT */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="finances-search-input"
            aria-label="Buscar club por nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar club por nombre..."
            className="pl-9 pr-9 h-10 border-white/[0.08] bg-card/60"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-56 h-10 text-xs border-white/[0.08] bg-card/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budget_desc">Mayor Presupuesto (€ ↓)</SelectItem>
              <SelectItem value="budget_asc">Menor Presupuesto (€ ↑)</SelectItem>
              <SelectItem value="squad_value_desc">Mayor Valor de Plantilla (€ ↓)</SelectItem>
              <SelectItem value="position_asc">Clasificación en Liga (1º → Último)</SelectItem>
              <SelectItem value="name_asc">Nombre Club (A → Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. CLUB FINANCIAL DIRECTORY LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Presupuestos por Club ({filteredTeams.length} de {teams.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            Límite máximo registrado: <strong className="text-foreground">{formatMoney(maxBudget)}</strong>
          </span>
        </div>

        {filteredTeams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/30 p-10 text-center space-y-2">
            <Shield className="size-8 mx-auto text-muted-foreground/60" aria-hidden="true" />
            <p className="font-display font-semibold text-foreground">
              No se han encontrado clubes
            </p>
            <p className="text-xs text-muted-foreground">
              Ningún equipo coincide con el término de búsqueda &quot;{search}&quot;.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearch("")}
              className="mt-2 min-h-[36px] h-9 px-4"
            >
              Restablecer búsqueda
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTeams.map((team) => (
              <FinanceRow key={team.id} team={team} maxBudget={maxBudget} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceRow({
  team,
  maxBudget,
}: {
  team: TeamWithStanding;
  maxBudget: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState(team.budget || 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pct = getBudgetPercentage(team.budget || 0, maxBudget);
  const squadValue = team.squad_value || 0;
  const ratio = squadValue > 0 ? Math.round(((team.budget || 0) / squadValue) * 100) : 0;

  async function save() {
    setError(null);
    if (budget < 0) {
      setError("El presupuesto debe ser mayor o igual a 0 €.");
      return;
    }
    try {
      await updateTeamClient(team.id, { budget });
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el presupuesto");
    }
  }

  function adjustBudget(delta: number) {
    setBudget((prev) => Math.max(0, prev + delta));
  }

  return (
    <Card className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:shadow-md h-full">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Position in league badge */}
          {team.position != null && (
            <span
              className={`size-7 shrink-0 flex items-center justify-center rounded-xl text-xs font-black font-mono tracking-tight ${
                team.position === 1
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : team.position <= 3
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-muted/60 text-muted-foreground border border-white/[0.06]"
              }`}
              title={`Posición ${team.position}º en la liga`}
            >
              #{team.position}
            </span>
          )}

          <TeamLogo
            name={team.name}
            logoUrl={team.logo_url}
            color={team.primary_color}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <Link
              href={`/teams/${team.id}`}
              className="truncate font-display text-sm sm:text-base font-bold tracking-tight text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline block"
              aria-label={`Ver perfil y plantilla del club ${team.name}`}
            >
              {team.name}
            </Link>
            {!editing && (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <BudgetDisplay
                  amount={team.budget}
                  size="md"
                  className="font-bold text-foreground text-sm"
                />
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({pct}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 min-h-[36px] h-8 px-3 gap-1.5 border-white/[0.1] bg-white/[0.02] text-xs font-semibold hover:bg-white/[0.06] transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => {
              setBudget(team.budget || 0);
              setEditing(true);
            }}
            aria-label={`Editar presupuesto de ${team.name}`}
          >
            <Pencil className="size-3 text-muted-foreground" aria-hidden="true" />
            <span>Editar</span>
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[36px] h-8 px-2.5 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(false)}
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Cancelar</span>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={save}
              className="min-h-[36px] h-8 px-3 gap-1.5 text-xs font-semibold"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-3.5" aria-hidden="true" />
              )}
              <span>{pending ? "…" : "Guardar"}</span>
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-end">
        {editing ? (
          <div className="space-y-3 pt-2 border-t border-border/50">
            {/* Quick Adjustment Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Ajuste Rápido
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { label: "+€10M", delta: 10_000_000, positive: true },
                  { label: "+€5M", delta: 5_000_000, positive: true },
                  { label: "+€1M", delta: 1_000_000, positive: true },
                  { label: "-€1M", delta: -1_000_000, positive: false },
                  { label: "-€5M", delta: -5_000_000, positive: false },
                  { label: "-€10M", delta: -10_000_000, positive: false },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => adjustBudget(chip.delta)}
                    className={`min-h-[28px] px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all border ${
                      chip.positive
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBudget(50_000_000)}
                  className="min-h-[28px] px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all border border-white/[0.1] bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Restablecer al presupuesto base oficial de la liga"
                >
                  €50M
                </button>
              </div>
            </div>

            {/* Direct Number Input */}
            <div>
              <label
                htmlFor={`team-budget-input-${team.id}`}
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1"
              >
                Cantidad exacta (€)
              </label>
              <MoneyInput
                id={`team-budget-input-${team.id}`}
                value={budget}
                onChange={setBudget}
                ariaLabel={`Presupuesto de ${team.name} en euros`}
              />
              {error && (
                <p className="mt-2 text-xs text-destructive font-medium" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {/* Visual Budget Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Capacidad vs. líder</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5 bg-white/[0.06]" />
            </div>

            {/* Economic Context Metrics Strip */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center gap-2">
                <Coins className="size-3.5 text-muted-foreground/70 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Plantilla
                  </span>
                  <span className="font-mono font-semibold text-foreground tabular-nums truncate block">
                    {formatMoney(squadValue)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="size-3.5 text-muted-foreground/70 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Ratio Solvencia
                  </span>
                  <span className="font-mono font-semibold text-foreground tabular-nums truncate block">
                    {ratio}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="size-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                <span>{team.player_count ?? 0} jugadores</span>
              </span>
              {team.avg_overall != null && (
                <span className="font-medium text-foreground">
                  Media: <strong className="font-mono">{team.avg_overall}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
