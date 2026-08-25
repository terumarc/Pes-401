"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MarketToggle } from "@/components/players/MarketToggle";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deletePlayerClient,
  updatePlayerClient,
} from "@/lib/data/mutations";
import type { Team } from "@/types";

type PlayerActionsProps = {
  playerId: string;
  availableInMarket: boolean;
  teams: Team[];
  currentTeamId: string;
};

export function PlayerActions({
  playerId,
  availableInMarket,
  teams,
  currentTeamId,
}: PlayerActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moving, setMoving] = useState(false);
  const [teamId, setTeamId] = useState(currentTeamId);

  async function moveTeam() {
    await updatePlayerClient(playerId, { team_id: teamId });
    setMoving(false);
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (
      !window.confirm(
        "¿Eliminar este jugador? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    await deletePlayerClient(playerId);
    startTransition(() => {
      router.push("/players");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/players/${playerId}?edit=1`}>Editar</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/players/${playerId}`}>Ver jugador</Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setMoving((v) => !v)}
      >
        Mover de equipo
      </Button>
      <MarketToggle playerId={playerId} available={availableInMarket} />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={remove}
      >
        Eliminar
      </Button>

      {moving && (
        <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-3">
          <Select value={teamId} onValueChange={(v) => v && setTeamId(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Equipo" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" onClick={moveTeam}>
            Confirmar
          </Button>
        </div>
      )}
    </div>
  );
}
