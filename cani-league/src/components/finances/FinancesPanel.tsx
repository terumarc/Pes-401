"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BudgetComparisonChart } from "@/components/charts/LeagueCharts";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { TeamLogo } from "@/components/teams/TeamCard";
import { Button } from "@/components/ui/button";
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

type FinancesPanelProps = {
  teams: Team[];
};

export function FinancesPanel({ teams }: FinancesPanelProps) {
  const maxBudget = Math.max(...teams.map((t) => t.budget), 1);
  const sorted = [...teams].sort((a, b) => b.budget - a.budget);
  const total = teams.reduce((sum, t) => sum + t.budget, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Comparativa de presupuestos
          </CardTitle>
          <CardDescription>
            Total en liga:{" "}
            <span className="font-medium text-foreground">
              <BudgetDisplay amount={total} size="sm" />
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
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

      <ul className="space-y-4">
        {sorted.map((team) => (
          <FinanceRow key={team.id} team={team} maxBudget={maxBudget} />
        ))}
      </ul>
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
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo
            name={team.name}
            logoUrl={team.logo_url}
            color={team.primary_color}
            size="sm"
          />
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold tracking-tight uppercase">
              {team.name}
            </h3>
            {!editing && <BudgetDisplay amount={team.budget} size="lg" />}
          </div>
        </div>
        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setBudget(team.budget);
              setEditing(true);
            }}
          >
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={save}>
              Guardar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="max-w-sm">
            <MoneyInput value={budget} onChange={setBudget} />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <Progress value={pct} className="h-2.5" />
        )}
      </CardContent>
    </Card>
  );
}
