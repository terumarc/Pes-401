"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlusIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateFixturesClient } from "@/lib/data/mutations";
import { toast } from "sonner";
import type { Team } from "@/types";
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

type GenerateFixturesBtnProps = {
    leagueId: string;
    teams: Team[];
};

export function GenerateFixturesBtn({ leagueId, teams }: GenerateFixturesBtnProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const totalMatches = (teams.length % 2 === 0 ? teams.length - 1 : teams.length) * 2 * Math.floor(teams.length / 2);

    async function generate() {
        setLoading(true);
        try {
            await generateFixturesClient(
                leagueId,
                teams.map((t) => t.id),
            );
            startTransition(() => {
                router.refresh();
                setOpen(false);
            });
        } catch (error: any) {
            console.error("Error al generar:", error);
            toast.error(error.message || "Error al crear el calendario");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button id="generate-fixtures-btn" disabled={loading} className="gap-2">
                    <CalendarPlusIcon className="h-4 w-4" />
                    {loading ? "Generando…" : "Generar calendario"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-primary/10 text-primary">
                        <InfoIcon className="h-6 w-6" />
                    </AlertDialogMedia>
                    <div className="space-y-1">
                        <AlertDialogTitle>¿Generar el calendario completo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se generará el calendario (ida + vuelta) para {teams.length} equipos. Esto creará un total de {totalMatches} partidos.
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            generate();
                        }}
                        disabled={loading}
                    >
                        {loading ? "Generando..." : "Sí, generar calendario"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
