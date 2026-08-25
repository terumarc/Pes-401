"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
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
import { transferPlayerClient } from "@/lib/data/mutations";
import { formatMoney } from "@/lib/format/money";
import type { Player, Team } from "@/types";

type TransferModalProps = {
    player: Player & { team: Pick<Team, "id" | "name"> };
    teams: Team[]; // todos los equipos de la liga
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type Status = "idle" | "loading" | "success" | "error";

export function TransferModal({
    player,
    teams,
    open,
    onOpenChange,
}: TransferModalProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [buyerTeamId, setBuyerTeamId] = useState<string>("");
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    // Equipos disponibles (excluye el equipo actual del jugador)
    const availableTeams = teams.filter((t) => t.id !== player.team_id);
    const selectedBuyer = teams.find((t) => t.id === buyerTeamId);
    const canAfford =
        selectedBuyer != null && selectedBuyer.budget >= player.transfer_price;

    async function handleTransfer() {
        if (!buyerTeamId) return;
        setStatus("loading");
        setErrorMsg("");
        try {
            await transferPlayerClient(player.id, buyerTeamId);
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Fichar jugador</DialogTitle>
                    <DialogDescription>
                        Selecciona el equipo que fichará a{" "}
                        <span className="font-semibold text-foreground">{player.name}</span>
                    </DialogDescription>
                </DialogHeader>

                {status === "success" ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                        <p className="font-semibold text-lg">¡Transferencia completada!</p>
                        <p className="text-sm text-muted-foreground">
                            {player.name} ahora juega en{" "}
                            {teams.find((t) => t.id === buyerTeamId)?.name}
                        </p>
                        <Button
                            className="mt-2"
                            onClick={() => handleClose(false)}
                        >
                            Cerrar
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Resumen del jugador */}
                        <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Jugador</span>
                                <span className="font-medium">{player.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Equipo actual</span>
                                <span>{player.team.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Precio de fichaje</span>
                                <span className="font-semibold text-foreground">
                                    <BudgetDisplay amount={player.transfer_price} size="sm" />
                                </span>
                            </div>
                        </div>

                        {/* Selector de equipo comprador */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Equipo comprador</label>
                            <Select value={buyerTeamId} onValueChange={setBuyerTeamId}>
                                <SelectTrigger id="transfer-buyer-select">
                                    <SelectValue placeholder="Selecciona un equipo…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTeams.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            <span className="flex items-center justify-between gap-3 w-full">
                                                <span>{t.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatMoney(t.budget)}
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Presupuesto en tiempo real */}
                            {selectedBuyer && (
                                <div
                                    className={`rounded-lg border p-3 text-sm space-y-1 ${canAfford
                                            ? "border-green-500/30 bg-green-500/5"
                                            : "border-red-500/30 bg-red-500/5"
                                        }`}
                                >
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Presupuesto actual</span>
                                        <BudgetDisplay amount={selectedBuyer.budget} size="sm" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Tras el fichaje</span>
                                        <span className="flex items-center gap-1.5">
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <BudgetDisplay
                                                amount={selectedBuyer.budget - player.transfer_price}
                                                size="sm"
                                                className={
                                                    canAfford ? "text-green-600" : "text-red-500"
                                                }
                                            />
                                        </span>
                                    </div>
                                    {!canAfford && (
                                        <p className="text-xs text-red-500 font-medium pt-1">
                                            ⚠ Presupuesto insuficiente
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {status === "error" && (
                            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {errorMsg}
                            </div>
                        )}

                        <DialogFooter showCloseButton>
                            <Button
                                id="transfer-confirm-btn"
                                disabled={!buyerTeamId || !canAfford || status === "loading"}
                                onClick={handleTransfer}
                            >
                                {status === "loading" ? "Procesando…" : "Confirmar fichaje"}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
