"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { TeamLogo } from "@/components/teams/TeamCard";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { updateTeamClient } from "@/lib/data/mutations";
import { formatMoney, getBudgetPercentage } from "@/lib/format/money";
import { calculatePositionReward } from "@/lib/economy";
import { cn } from "@/lib/utils";
import type { TeamWithStanding } from "@/types";

const STEPS = [-10_000_000, -1_000_000, 1_000_000, 10_000_000];

function stepLabel(delta: number) {
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta) / 1_000_000}M`;
}

/** Hoja para cambiar el presupuesto de un club. */
function BudgetSheet({ team, onClose }: { team: TeamWithStanding; onClose: () => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [budget, setBudget] = useState(team.budget || 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = budget !== (team.budget || 0);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateTeamClient(team.id, { budget });
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el presupuesto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onClose} className="h-11 justify-self-start text-[length:min(1rem,25.5px)] text-[#0a84ff] active:opacity-60">
          Cancelar
        </button>
        <DialogTitle className="text-[length:min(1rem,25.5px)] font-semibold">Presupuesto</DialogTitle>
        <button
          type="button"
          onClick={save}
          disabled={busy || !changed}
          className="h-11 justify-self-end text-[length:min(1rem,25.5px)] font-semibold text-[#0a84ff] active:opacity-60 disabled:text-muted-foreground"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <DialogDescription className="sr-only">Cambiar el presupuesto de {team.name}</DialogDescription>

      <div className="mt-5 flex flex-col items-center gap-2">
        <TeamLogo name={team.name} logoUrl={team.logo_url} color={team.primary_color} size="lg" />
        <p className="text-[length:min(1rem,25.5px)] font-semibold">{team.name}</p>
        <p className="text-[length:min(2rem,51px)] font-bold tabular-nums tracking-tight">{formatMoney(budget)}</p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setBudget((b) => Math.max(0, b + d))}
            className="h-11 rounded-full bg-secondary text-[length:min(0.8824rem,22.5px)] font-semibold tabular-nums active:opacity-70"
          >
            {stepLabel(d)}
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="mb-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Cantidad exacta</span>
        <MoneyInput id={`budget-${team.id}`} value={budget} onChange={setBudget} ariaLabel={`Presupuesto de ${team.name} en euros`} />
      </label>
      {error && <p className="mt-3 text-[length:min(0.8824rem,22.5px)] text-destructive">{error}</p>}
    </DialogContent>
  );
}

/** Finanzas en listas agrupadas de iOS: presupuesto de cada club y normas económicas. */
export function FinancesPanel({
  teams,
  salaryByTeam = {},
  extra,
}: {
  teams: TeamWithStanding[];
  /** Sueldos que paga cada club por temporada. */
  salaryByTeam?: Record<string, number>;
  /** Secciones de contratos (sueldos y último cierre), entre Presupuestos y Normas. */
  extra?: ReactNode;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [showRewards, setShowRewards] = useState(false);
  const sorted = [...teams].sort((a, b) => (b.budget || 0) - (a.budget || 0));
  const maxBudget = Math.max(...teams.map((t) => t.budget || 0), 1);
  const editing = teams.find((t) => t.id === editId) ?? null;

  return (
    <div className="space-y-8">
      <section aria-labelledby="fin-budgets">
        <h2 id="fin-budgets" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
          Presupuestos
        </h2>
        <ul className="overflow-hidden rounded-[22px] bg-card">
          {sorted.map((t) => {
            const pct = getBudgetPercentage(t.budget || 0, maxBudget);
            return (
              <li key={t.id} className="group">
                <button
                  type="button"
                  onClick={() => setEditId(t.id)}
                  className="flex min-h-[68px] w-full items-center gap-3 pl-4 text-left transition-colors active:bg-white/[0.06]"
                  aria-label={`${t.name}: ${formatMoney(t.budget || 0)}. Cambiar presupuesto`}
                >
                  <TeamLogo name={t.name} logoUrl={t.logo_url} color={t.primary_color} size="sm" />
                  <div className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border py-3 pr-3 group-last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="line-clamp-2 min-w-[5rem] flex-1 text-[length:min(1rem,25.5px)] leading-tight">{t.name}</p>
                        <p className="ml-auto shrink-0 text-[length:min(1rem,25.5px)] font-semibold tabular-nums">{formatMoney(t.budget || 0)}</p>
                      </div>
                      {/* Barra respecto al club con más presupuesto */}
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
                        <div className="h-full rounded-full bg-white/70" style={{ width: `${pct}%` }} />
                      </div>
                      {salaryByTeam[t.id] > 0 && (
                        <p className="mt-1.5 text-[length:min(0.7647rem,19.5px)] text-muted-foreground tabular-nums">
                          Sueldos {formatMoney(salaryByTeam[t.id])} por temporada
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#5a5a5f]" aria-hidden />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 px-4 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Toca un club para cambiar su presupuesto.</p>
      </section>

      {extra}

      <section aria-labelledby="fin-rules">
        <h2 id="fin-rules" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
          Normas
        </h2>
        <ul className="overflow-hidden rounded-[22px] bg-card">
          {[
            ["Venta directa al mercado", "30 % del valor"],
            ["Cláusula de rescisión", "100 % al club de origen"],
          ].map(([k, v]) => (
            <li key={k} className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-3 text-[length:min(1rem,25.5px)]">
              <span>{k}</span>
              <span className="text-right text-muted-foreground">{v}</span>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setShowRewards((s) => !s)}
              aria-expanded={showRewards}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[length:min(1rem,25.5px)] active:bg-white/[0.06]"
            >
              <span>Premio por posición</span>
              <ChevronRight className={cn("size-4 text-[#5a5a5f] transition-transform", showRewards && "rotate-90")} aria-hidden />
            </button>
            {showRewards && (
              <ul className="border-t border-border">
                {teams.map((_, i) => (
                  <li key={i} className="flex items-center justify-between border-b border-border py-2.5 pl-8 pr-4 text-[length:min(0.8824rem,22.5px)] last:border-b-0">
                    <span className="text-muted-foreground">{i + 1}.º</span>
                    <span className="tabular-nums">{formatMoney(calculatePositionReward(i + 1))}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
        <p className="mt-2 px-4 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
          Los premios por posición se cobran al acabar la ida y al acabar la liga. Ganar partidos no da dinero.
        </p>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditId(null)}>
        {editing && <BudgetSheet key={editing.id} team={editing} onClose={() => setEditId(null)} />}
      </Dialog>
    </div>
  );
}
