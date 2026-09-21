"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight, Zap, Store, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { PlayerAvatar } from "@/components/players/PlayerCard";
import { getPlayerTier, getPlayerEffectiveRating } from "@/lib/players";
import { formatMoney } from "@/lib/format/money";
import type { Player, Team } from "@/types";

type TransferModalProps = {
    player: Player & { team?: Pick<Team, "id" | "name"> | null };
    teams: Team[]; // todos los equipos de la liga
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseType?: "clausula" | "mercado";
};

type Status = "idle" | "loading" | "success" | "error";

export function TransferModal({
    player,
    teams,
    open,
    onOpenChange,
    purchaseType = "clausula",
}: TransferModalProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [buyerTeamId, setBuyerTeamId] = useState<string>("");
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    // Determine purchase price: if clausula, check clause_fee then transfer_price
    const price =
        purchaseType === "clausula" && player.clause_fee != null
            ? player.clause_fee
            : player.transfer_price;

    // Equipos disponibles (excluye el equipo actual del jugador y equipos de agentes libres)
    const availableTeams = teams.filter(
        (t) =>
            t.id !== player.team_id &&
            !t.name.toLowerCase().includes("libre") &&
            !t.name.toLowerCase().includes("sin equipo")
    );
    const selectedBuyer = teams.find((t) => t.id === buyerTeamId);
    const canAfford = selectedBuyer != null && selectedBuyer.budget >= price;

    const tierInfo = getPlayerTier(player);
    const rating = getPlayerEffectiveRating(player);

    async function handleTransfer() {
        if (!buyerTeamId) return;
        setStatus("loading");
        setErrorMsg("");
        try {
            const res = await fetch("/api/market/buy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    playerId: player.id,
                    buyerTeamId,
                    type: purchaseType,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Error al realizar el fichaje");
            }

            setStatus("success");
            startTransition(() => router.refresh());
        } catch (err) {
            setStatus("error");
            setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
        }
    }

    function handleClose(open: boolean) {
        if (!open) {
            setStatus("idle");
            setBuyerTeamId("");
            setErrorMsg("");
        }
        onOpenChange(open);
    }

    const isClausula = purchaseType === "clausula";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md border-white/[0.08] bg-card/95 backdrop-blur-xl shadow-2xl p-6">
                <DialogHeader className="space-y-1.5 pb-2 border-b border-border/50">
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-display font-bold">
                        {isClausula ? (
                            <span className="flex items-center gap-2 text-amber-500">
                                <Zap className="size-5 shrink-0" aria-hidden="true" />
                                Cláusula de Rescisión
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-primary">
                                <Store className="size-5 shrink-0" aria-hidden="true" />
                                Fichar Agente Libre
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                        {isClausula
                            ? "Ejecuta la cláusula contractual para incorporar al jugador inmediatamente."
                            : "Ficha a este agente libre para reforzar la plantilla de tu club."}
                    </DialogDescription>
                </DialogHeader>

                {status === "success" ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center animate-in zoom-in-95 duration-200">
                        <CheckCircle2 className="size-12 text-emerald-500" aria-hidden="true" />
                        <h3 className="font-display font-bold text-lg text-foreground">¡Operación Completada!</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            <span className="font-semibold text-foreground">{player.name}</span> se ha incorporado con éxito a{" "}
                            <span className="font-semibold text-foreground">
                                {teams.find((t) => t.id === buyerTeamId)?.name}
                            </span>.
                        </p>
                        <Button
                            className="mt-3 min-h-[40px] h-10 px-6 font-semibold"
                            onClick={() => handleClose(false)}
                        >
                            Cerrar
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {/* Resumen del jugador */}
                        <div className="flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-muted/40 p-3">
                            <PlayerAvatar name={player.name} photoUrl={player.photo_url ?? null} size="md" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="truncate font-display text-sm font-bold text-foreground">
                                        {player.name}
                                    </h4>
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                                        {player.position}
                                    </span>
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${tierInfo.bgColor} ${tierInfo.color}`}>
                                        T{tierInfo.tier} · {rating}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {player.team?.name ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Shield className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                                            {player.team.name}
                                        </span>
                                    ) : (
                                        <span className="text-emerald-500 font-medium">Agente Libre</span>
                                    )}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                                    {isClausula ? "Cláusula" : "Precio"}
                                </span>
                                <BudgetDisplay amount={price} size="sm" className="font-bold text-foreground" />
                            </div>
                        </div>

                        {/* Selector de equipo comprador */}
                        <div className="space-y-2">
                            <label htmlFor="transfer-buyer-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                                Equipo comprador
                            </label>
                            <Select value={buyerTeamId} onValueChange={setBuyerTeamId}>
                                <SelectTrigger id="transfer-buyer-select" className="w-full h-11 border-white/[0.08] bg-background/50">
                                    <SelectValue placeholder="Selecciona el club que ficha…" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {availableTeams.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            <div className="flex items-center justify-between gap-4 w-full">
                                                <span className="font-medium text-foreground">{t.name}</span>
                                                <span className="text-xs tabular-nums text-muted-foreground font-mono">
                                                    {formatMoney(t.budget)}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Presupuesto en tiempo real */}
                            {selectedBuyer && (
                                <div
                                    className={`rounded-xl border p-3.5 text-xs space-y-2 transition-colors ${
                                        canAfford
                                            ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20"
                                            : "border-red-500/20 bg-red-500/5 dark:bg-red-950/20"
                                    }`}
                                >
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Presupuesto actual:</span>
                                        <BudgetDisplay amount={selectedBuyer.budget} size="sm" />
                                    </div>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Coste de la operación:</span>
                                        <span className="font-semibold text-foreground font-mono">
                                            -{formatMoney(price)}
                                        </span>
                                    </div>
                                    <div className="border-t border-border/40 pt-2 flex justify-between items-center">
                                        <span className="font-semibold text-foreground">Saldo restante:</span>
                                        <div className="flex items-center gap-1.5 font-bold font-mono">
                                            <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
                                            <BudgetDisplay
                                                amount={selectedBuyer.budget - price}
                                                size="sm"
                                                className={
                                                    canAfford ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                                                }
                                            />
                                        </div>
                                    </div>
                                    {!canAfford && (
                                        <div className="flex items-center gap-1.5 pt-1 text-red-500 text-xs font-semibold">
                                            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                                            <span>Presupuesto insuficiente para formalizar la operación.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {status === "error" && (
                            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleClose(false)}
                                className="min-h-[40px] h-10 px-4"
                            >
                                Cancelar
                            </Button>
                            <Button
                                id="transfer-confirm-btn"
                                disabled={!buyerTeamId || !canAfford || status === "loading"}
                                onClick={handleTransfer}
                                className="min-h-[40px] h-10 px-5 font-semibold gap-2"
                            >
                                {status === "loading" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                                {status === "loading"
                                    ? "Procesando operación…"
                                    : isClausula
                                    ? "Pagar Cláusula y Fichar"
                                    : "Confirmar Fichaje"}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
