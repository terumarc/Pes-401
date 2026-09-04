"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MarketToggle } from "@/components/players/MarketToggle";
import { ReleasePlayerModal } from "@/components/players/ReleasePlayerModal";
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
import { Coins } from "lucide-react";
import type { Player, Team } from "@/types";

type PlayerActionsProps = {
  playerId: string;
  availableInMarket: boolean;
  teams: Team[];
  currentTeamId: string;
  player?: Pick<
    Player,
    "id" | "name" | "photo_url" | "position" | "transfer_price" | "market_value" | "team_id"
  >;
};

export function PlayerActions({
  playerId,
  availableInMarket,
  teams,
  currentTeamId,
  player,
}: PlayerActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moving, setMoving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [teamId, setTeamId] = useState(currentTeamId);

  const currentTeam = teams.find((t) => t.id === currentTeamId);
  const isFreeAgent =
    !currentTeamId ||
    !currentTeam ||
    currentTeam.name.toLowerCase().includes("libre") ||
    currentTeam.name.toLowerCase().includes("sin equipo");

  const playerForRelease = player ?? {
    id: playerId,
    name: "Jugador",
    photo_url: null,
    position: "",
    transfer_price: 0,
    market_value: 0,
    team_id: currentTeamId,
  };

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
      {!isFreeAgent && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 font-semibold"
          onClick={() => setReleasing(true)}
        >
          <Coins className="size-3.5 text-amber-500" />
          Liberar
        </Button>
      )}
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

      {!isFreeAgent && (
        <ReleasePlayerModal
          player={playerForRelease}
          currentTeam={currentTeam}
          open={releasing}
          onOpenChange={setReleasing}
        />
      )}

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
