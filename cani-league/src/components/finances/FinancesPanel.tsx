"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BudgetComparisonChart } from "@/components/charts/LeagueCharts";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { TeamLogo } from "@/components/teams/TeamCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { updateTeamClient } from "@/lib/data/mutations";
import { getBudgetPercentage } from "@/lib/format/money";
import type { Team } from "@/types";
import { Pencil, Check, X, Wallet, TrendingUp } from "lucide-react";

type FinancesPanelProps = {
  teams: Team[];
};

export function FinancesPanel({ teams }: FinancesPanelProps) {
  const maxBudget = Math.max(...teams.map((t) => t.budget), 1);
  const sorted = [...teams].sort((a, b) => b.budget - a.budget);
  const total = teams.reduce((sum, t) => sum + t.budget, 0);

  return (
    <div className="space-y-6">
      <Card className="border border-white/[0.08] bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-white/[0.06] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg font-semibold tracking-tight">
                Comparativa de Presupuestos
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Distribución del límite salarial y masa económica entre los clubes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 self-start sm:self-auto">
              <Wallet className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Liga:</span>
              <BudgetDisplay amount={total} size="sm" className="font-semibold text-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <BudgetComparisonChart
            teams={teams.map((t) => ({
              name: t.name,
              short_name: t.short_name,
              budget: t.budget,
              color: t.primary_color,
            }))}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase px-1">
          Presupuestos por Club ({teams.length})
        </h3>
        <ul className="space-y-3">
          {sorted.map((team) => (
            <FinanceRow key={team.id} team={team} maxBudget={maxBudget} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function FinanceRow({ team, maxBudget }: { team: Team; maxBudget: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState(team.budget);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pct = getBudgetPercentage(team.budget, maxBudget);

  async function save() {
    setError(null);
    if (budget < 0) {
      setError("El presupuesto debe ser ≥ 0");
      return;
    }
    try {
      await updateTeamClient(team.id, { budget });
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.16] hover:shadow-md">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <TeamLogo
            name={team.name}
            logoUrl={team.logo_url}
            color={team.primary_color}
            size="sm"
          />
          <div className="min-w-0">
            <h4 className="truncate font-display text-sm sm:text-base font-semibold tracking-tight text-foreground">
              {team.name}
            </h4>
            {!editing && (
              <div className="flex items-center gap-2 mt-0.5">
                <BudgetDisplay amount={team.budget} size="md" className="font-semibold text-foreground/90" />
                <span className="text-[11px] text-muted-foreground">
                  ({pct}% del mayor)
                </span>
              </div>
            )}
          </div>
        </div>

        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-white/[0.1] bg-white/[0.02] text-xs font-medium hover:bg-white/[0.06] transition-colors"
            onClick={() => {
              setBudget(team.budget);
              setEditing(true);
            }}
          >
            <Pencil className="size-3 text-muted-foreground" />
            <span>Editar</span>
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(false)}
            >
              <X className="size-3" />
              <span>Cancelar</span>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={save}
              className="h-8 gap-1 text-xs"
            >
              <Check className="size-3" />
              <span>{pending ? "Guardando…" : "Guardar"}</span>
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 sm:px-5">
        {editing ? (
          <div className="max-w-sm pt-2">
            <MoneyInput value={budget} onChange={setBudget} />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Progress value={pct} className="h-1.5 bg-white/[0.06]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
