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
    hasExisting?: boolean;
};

export function GenerateFixturesBtn({ leagueId, teams, hasExisting = false }: GenerateFixturesBtnProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Filtrar siempre para garantizar que Agentes Libres nunca se incluya
    const validTeams = teams.filter(
        (t) => !t.name.toLowerCase().includes("libre") && !t.name.toLowerCase().includes("sin equipo")
    );
    const totalMatches = (validTeams.length % 2 === 0 ? validTeams.length - 1 : validTeams.length) * 2 * Math.floor(validTeams.length / 2);

    async function generate() {
        setLoading(true);
        try {
            await generateFixturesClient(leagueId);
            toast.success("¡Calendario generado con éxito!");
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
                <Button
                    id="generate-fixtures-btn"
                    variant={hasExisting ? "outline" : "default"}
                    disabled={loading}
                    className="gap-2"
                >
                    <CalendarPlusIcon className="h-4 w-4" />
                    {loading
                        ? "Generando…"
                        : hasExisting
                        ? "Regenerar calendario"
                        : "Generar calendario"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-primary/10 text-primary">
                        <InfoIcon className="h-6 w-6" />
                    </AlertDialogMedia>
                    <div className="space-y-1">
                        <AlertDialogTitle>
                            {hasExisting
                                ? "¿Regenerar el calendario completo?"
                                : "¿Generar el calendario completo?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {hasExisting
                                ? `Ya existen partidos programados. Al regenerar se borrarán los partidos existentes y se crearán los ${totalMatches} partidos oficiales (ida + vuelta) para los ${validTeams.length} equipos de la liga.`
                                : `Se generará el calendario oficial (ida + vuelta) para ${validTeams.length} equipos (${totalMatches} partidos).`}
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
