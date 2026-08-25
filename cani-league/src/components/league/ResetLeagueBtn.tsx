"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetLeagueClient } from "@/lib/data/mutations";
import { toast } from "sonner";
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

    async function handleReset() {
        setLoading(true);
        try {
            await resetLeagueClient(leagueId);
            toast.success("Liga reseteada (calendario eliminado y fondos restablecidos).");
            startTransition(() => {
                router.refresh();
                setOpen(false);
            });
        } catch (error: any) {
            console.error("Error al resetear liga:", error);
            toast.error(error.message || "Error al resetear la liga");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading} className="gap-2">
                    <Trash2Icon className="h-4 w-4" />
                    {loading ? "Reseteando…" : "Reiniciar Liga"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-destructive/10 text-destructive">
                        <TriangleAlertIcon className="h-6 w-6" />
                    </AlertDialogMedia>
                    <div className="space-y-1">
                        <AlertDialogTitle>¿Resetear la liga completa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esto borrará TODO el calendario de partidos y restablecerá los fondos de los equipos (50.000.000 €). <strong>No se puede deshacer.</strong>
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>
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
                        {loading ? "Borrando..." : "Sí, reiniciar liga"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
