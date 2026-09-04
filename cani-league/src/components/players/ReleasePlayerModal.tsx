"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { PlayerAvatar } from "@/components/players/PlayerCard";
import { releasePlayerClient } from "@/lib/data/mutations";
import { formatMoney } from "@/lib/format/money";
import { AlertCircle, ArrowRight, CheckCircle2, Coins, Loader2 } from "lucide-react";
import type { Player, Team } from "@/types";

type ReleasePlayerModalProps = {
  player: Pick<
    Player,
    "id" | "name" | "photo_url" | "position" | "transfer_price" | "market_value" | "team_id"
  >;
  currentTeam?: Pick<Team, "id" | "name" | "budget">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function ReleasePlayerModal({
  player,
  currentTeam,
  open,
  onOpenChange,
  onSuccess,
}: ReleasePlayerModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const price = player.transfer_price || player.market_value || 0;
  const releaseAmount = Math.round(price * 0.3);
  const currentBudget = currentTeam?.budget ?? 0;
  const newBudget = currentBudget + releaseAmount;

  async function handleRelease() {
    setLoading(true);
    setError(null);

    try {
      await releasePlayerClient(player.id);
      setSuccess(true);
      startTransition(() => {
        router.refresh();
        onSuccess?.();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al liberar jugador");
    } finally {
      setLoading(false);
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setSuccess(false);
      setError(null);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <Coins className="size-5 text-amber-500" />
            Liberar Jugador al Mercado
          </DialogTitle>
          <DialogDescription>
            Vende directamente al jugador por el <strong>30% de su precio</strong>.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-14 text-emerald-500 animate-in zoom-in-50 duration-300" />
            <h3 className="font-display text-xl font-bold">¡Jugador Liberado!</h3>
            <p className="text-sm text-muted-foreground">
              <strong>{player.name}</strong> ha sido liberado al mercado de Agentes Libres.
            </p>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Se han ingresado +{formatMoney(releaseAmount)} al presupuesto del club
            </div>
            <Button className="mt-4 w-full" onClick={() => handleClose(false)}>
              Aceptar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Tarjeta del jugador */}
            <div className="flex items-center gap-3.5 rounded-2xl border bg-muted/40 p-3.5">
              <PlayerAvatar name={player.name} photoUrl={player.photo_url ?? null} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-display text-base font-bold">{player.name}</h4>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                    {player.position}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {currentTeam?.name || "Tu equipo"}
                </p>
              </div>
            </div>

            {/* Desglose de la venta */}
            <div className="rounded-2xl border bg-card p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Precio del jugador:</span>
                <span className="font-semibold text-foreground">
                  <BudgetDisplay amount={price} size="sm" />
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Porcentaje de venta directa:</span>
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  30%
                </span>
              </div>

              <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                <span className="font-medium text-foreground">Ingreso para el club:</span>
                <span className="font-display text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(releaseAmount)}
                </span>
              </div>

              {currentTeam?.budget != null && (
                <div className="border-t border-border/60 pt-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Presupuesto actual:</span>
                    <span>{formatMoney(currentBudget)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-foreground">
                    <span className="flex items-center gap-1">
                      Nuevo presupuesto: <ArrowRight className="size-3 text-emerald-500" />
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(newBudget)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso informativo */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground flex gap-2">
              <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                Al liberar al jugador, abandonará inmediatamente tu plantilla y pasará al mercado
                de <strong>Agentes Libres</strong> disponible para ser fichado por cualquier club.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
                onClick={handleRelease}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Liberando...
                  </>
                ) : (
                  <>
                    <Coins className="size-4" />
                    Confirmar y Liberar (+{formatMoney(releaseAmount)})
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
