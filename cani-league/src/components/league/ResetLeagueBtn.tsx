"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, TriangleAlertIcon, CalendarX2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetLeagueClient } from "@/lib/data/mutations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ResetLeagueBtnProps = {
    leagueId: string;
};

export function ResetLeagueBtn({ leagueId }: ResetLeagueBtnProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"calendar" | "league">("calendar");

    async function handleReset() {
        setLoading(true);
        try {
            await resetLeagueClient(leagueId, mode);
            if (mode === "calendar") {
                toast.success("Calendario reiniciado (partidos eliminados, presupuestos conservados).");
            } else {
                toast.success("Liga reseteada (calendario eliminado y presupuestos restablecidos a 50M €).");
            }
            setOpen(false);
            startTransition(() => {
                router.refresh();
            });
        } catch (error: any) {
            console.error("Error al resetear:", error);
            toast.error(error.message || "Error al procesar el reinicio");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading} className="gap-2">
                    <Trash2Icon className="h-4 w-4" />
                    {loading ? "Reseteando…" : "Reiniciar..."}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <TriangleAlertIcon className="h-6 w-6" />
                    </AlertDialogMedia>
                    <div className="space-y-1">
                        <AlertDialogTitle>Opciones de Reinicio</AlertDialogTitle>
                        <AlertDialogDescription>
                            Selecciona qué deseas reiniciar. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>

                {/* Selector de modo */}
                <div className="my-2 space-y-2.5">
                    <button
                        type="button"
                        onClick={() => setMode("calendar")}
                        className={cn(
                            "w-full rounded-xl border p-3 text-left transition-all",
                            mode === "calendar"
                                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                : "border-border/70 hover:bg-muted/50",
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <CalendarX2 className="mt-0.5 size-5 shrink-0 text-primary" />
                            <div>
                                <p className="font-display text-sm font-semibold text-foreground">
                                    Solo reiniciar calendario
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Elimina todos los partidos jugados y pendientes. <strong>Mantiene intactos</strong> los presupuestos y la plantilla de los equipos.
                                </p>
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode("league")}
                        className={cn(
                            "w-full rounded-xl border p-3 text-left transition-all",
                            mode === "league"
                                ? "border-destructive bg-destructive/10 ring-2 ring-destructive/30"
                                : "border-border/70 hover:bg-muted/50",
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <Coins className="mt-0.5 size-5 shrink-0 text-destructive" />
                            <div>
                                <p className="font-display text-sm font-semibold text-destructive">
                                    Reiniciar liga completa
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Elimina los partidos y <strong>restablece todos los presupuestos</strong> a 50.000.000 € (excepto Agentes Libres).
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={(e) => {
                            e.preventDefault();
                            handleReset();
                        }}
                        disabled={loading}
                    >
                        {loading
                            ? "Borrando..."
                            : mode === "calendar"
                            ? "Sí, reiniciar calendario"
                            : "Sí, reiniciar liga completa"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

