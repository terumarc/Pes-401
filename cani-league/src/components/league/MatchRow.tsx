"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    recordMatchResultClient,
    resetMatchResultClient,
} from "@/lib/data/mutations";
import type { MatchWithTeams } from "@/types";

type MatchRowProps = {
    match: MatchWithTeams;
};

export function MatchRow({ match }: MatchRowProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [editing, setEditing] = useState(false);
    const [homeGoals, setHomeGoals] = useState(
        match.home_goals?.toString() ?? "",
    );
    const [awayGoals, setAwayGoals] = useState(
        match.away_goals?.toString() ?? "",
    );
    const [saving, setSaving] = useState(false);

    async function save() {
        const hg = parseInt(homeGoals, 10);
        const ag = parseInt(awayGoals, 10);
        if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) return;
        setSaving(true);
        await recordMatchResultClient(match.id, hg, ag);
        setSaving(false);
        setEditing(false);
        startTransition(() => router.refresh());
    }

    async function reset() {
        if (!confirm("¿Borrar el resultado de este partido?")) return;
        await resetMatchResultClient(match.id);
        setHomeGoals("");
        setAwayGoals("");
        startTransition(() => router.refresh());
    }

    const homeColor = match.home_team.primary_color ?? "#6366f1";
    const awayColor = match.away_team.primary_color ?? "#6366f1";

    return (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg-elevated px-4 py-3 text-sm shadow-[var(--shadow-soft)] transition-shadow hover:shadow-md">
            {/* Equipo local */}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <span className="truncate font-medium">{match.home_team.short_name ?? match.home_team.name}</span>
                <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: homeColor }}
                />
            </div>

            {/* Marcador / editor */}
            <div className="flex shrink-0 items-center gap-1.5">
                {editing ? (
                    <>
                        <Input
                            id={`home-goals-${match.id}`}
                            type="number"
                            min={0}
                            value={homeGoals}
                            onChange={(e) => setHomeGoals(e.target.value)}
                            className="w-14 text-center"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                            id={`away-goals-${match.id}`}
                            type="number"
                            min={0}
                            value={awayGoals}
                            onChange={(e) => setAwayGoals(e.target.value)}
                            className="w-14 text-center"
                        />
                        <Button size="icon-sm" onClick={save} disabled={saving}>
                            <CheckIcon className="h-4 w-4" />
                        </Button>
                    </>
                ) : match.played ? (
                    <>
                        <span className="w-16 text-center font-display text-lg font-semibold tabular-nums">
                            {match.home_goals} – {match.away_goals}
                        </span>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                                setHomeGoals(match.home_goals?.toString() ?? "");
                                setAwayGoals(match.away_goals?.toString() ?? "");
                                setEditing(true);
                            }}
                        >
                            <PencilIcon className="h-3 w-3" />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={reset}
                        >
                            <RotateCcwIcon className="h-3 w-3" />
                        </Button>
                    </>
                ) : (
                    <>
                        <span className="w-16 text-center text-muted-foreground">vs</span>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => setEditing(true)}
                        >
                            <PencilIcon className="h-3 w-3" />
                        </Button>
                    </>
                )}
            </div>

            {/* Equipo visitante */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: awayColor }}
                />
                <span className="truncate font-medium">{match.away_team.short_name ?? match.away_team.name}</span>
            </div>
        </div>
    );
}
