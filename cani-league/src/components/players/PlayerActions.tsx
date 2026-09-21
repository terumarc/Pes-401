"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MarketToggle } from "@/components/players/MarketToggle";
import { ReleasePlayerModal } from "@/components/players/ReleasePlayerModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  setPlayerMarketClient,
} from "@/lib/data/mutations";
import {
  ArrowRightLeft,
  Coins,
  Edit3,
  MoreHorizontal,
  Store,
  Trash2,
  Loader2,
} from "lucide-react";
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
  variant?: "default" | "compact";
};

export function PlayerActions({
  playerId,
  availableInMarket,
  teams,
  currentTeamId,
  player,
  variant = "default",
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

  async function toggleMarket() {
    await setPlayerMarketClient(playerId, !availableInMarket);
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (
      !window.confirm(
        `¿Eliminar a ${playerForRelease.name}? Esta acción no se puede deshacer.`
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

  // --- MODO COMPACTO (Para tarjetas en listas y cuadrículas) ---
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          asChild
          variant="outline"
          className="min-h-[36px] h-9 px-3 text-xs font-semibold border-white/[0.1] hover:border-white/[0.22] hover:bg-white/[0.06] transition-all"
        >
          <Link href={`/players/${playerId}`}>
            Ver ficha
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="size-9 min-h-[36px] min-w-[36px] p-0 border-white/[0.1] hover:border-white/[0.22] hover:bg-white/[0.06] transition-all"
              aria-label={`Opciones de gestión para ${playerForRelease.name}`}
            >
              <MoreHorizontal className="size-4 text-foreground/80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-1.5">
            <DropdownMenuItem asChild>
              <Link
                href={`/players/${playerId}?edit=1`}
                className="flex items-center gap-2.5 cursor-pointer py-2 text-xs font-medium"
              >
                <Edit3 className="size-3.5 text-muted-foreground" />
                <span>Editar jugador</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setMoving(true)}
              className="flex items-center gap-2.5 cursor-pointer py-2 text-xs font-medium"
            >
              <ArrowRightLeft className="size-3.5 text-muted-foreground" />
              <span>Mover de equipo</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={toggleMarket}
              className="flex items-center gap-2.5 cursor-pointer py-2 text-xs font-medium"
            >
              <Store className="size-3.5 text-muted-foreground" />
              <span>{availableInMarket ? "Retirar de mercado" : "Poner en mercado"}</span>
            </DropdownMenuItem>

            {!isFreeAgent && (
              <DropdownMenuItem
                onClick={() => setReleasing(true)}
                className="flex items-center gap-2.5 cursor-pointer py-2 text-xs font-semibold text-amber-400 focus:text-amber-300 focus:bg-amber-500/10"
              >
                <Coins className="size-3.5 text-amber-400" />
                <span>Liberar (+30% valor)</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="my-1 bg-white/[0.08]" />

            <DropdownMenuItem
              onClick={remove}
              className="flex items-center gap-2.5 cursor-pointer py-2 text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              <span>Eliminar jugador</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Modal de Mover Equipo Accesible */}
        <Dialog open={moving} onOpenChange={setMoving}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-display">
                <ArrowRightLeft className="size-4 text-primary" />
                Mover a {playerForRelease.name}
              </DialogTitle>
              <DialogDescription>
                Selecciona el club de destino al que deseas transferir al futbolista.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <label htmlFor="team-select-compact" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Equipo de destino:
              </label>
              <Select value={teamId} onValueChange={(v) => v && setTeamId(v)}>
                <SelectTrigger id="team-select-compact" className="w-full h-10 border-white/[0.1]">
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="min-h-[40px]"
                onClick={() => setMoving(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="min-h-[40px] font-semibold"
                onClick={moveTeam}
              >
                Confirmar Traspaso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!isFreeAgent && (
          <ReleasePlayerModal
            player={playerForRelease}
            currentTeam={currentTeam}
            open={releasing}
            onOpenChange={setReleasing}
          />
        )}
      </div>
    );
  }

  // --- MODO DEFAULT (Para la página de perfil /players/[id]) ---
  return (
    <div className="flex flex-wrap gap-2.5">
      <Button
        variant="outline"
        className="min-h-[40px] px-4 gap-2 text-xs sm:text-sm font-medium border-white/[0.1] hover:border-white/[0.22] hover:bg-white/[0.06] transition-all"
        asChild
      >
        <Link href={`/players/${playerId}?edit=1`}>
          <Edit3 className="size-4 text-muted-foreground" />
          Editar
        </Link>
      </Button>

      <Button
        type="button"
        variant="outline"
        className="min-h-[40px] px-4 gap-2 text-xs sm:text-sm font-medium border-white/[0.1] hover:border-white/[0.22] hover:bg-white/[0.06] transition-all"
        onClick={() => setMoving(true)}
      >
        <ArrowRightLeft className="size-4 text-muted-foreground" />
        Mover de equipo
      </Button>

      <MarketToggle
        playerId={playerId}
        available={availableInMarket}
        className="min-h-[40px] px-4 text-xs sm:text-sm"
      />

      {!isFreeAgent && (
        <Button
          type="button"
          variant="outline"
          className="min-h-[40px] px-4 gap-2 border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/50 transition-all text-xs sm:text-sm font-semibold"
          onClick={() => setReleasing(true)}
        >
          <Coins className="size-4 text-amber-400" />
          Liberar (+30%)
        </Button>
      )}

      <Button
        type="button"
        variant="destructive"
        className="min-h-[40px] px-4 gap-2 text-xs sm:text-sm font-medium"
        disabled={pending}
        onClick={remove}
        aria-label={`Eliminar definitivamente a ${playerForRelease.name}`}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        Eliminar
      </Button>

      {/* Modal de Mover Equipo Accesible */}
      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-display">
              <ArrowRightLeft className="size-4 text-primary" />
              Mover a {playerForRelease.name}
            </DialogTitle>
            <DialogDescription>
              Selecciona el club de destino al que deseas transferir al futbolista.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <label htmlFor="team-select-full" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Equipo de destino:
            </label>
            <Select value={teamId} onValueChange={(v) => v && setTeamId(v)}>
              <SelectTrigger id="team-select-full" className="w-full h-10 border-white/[0.1]">
                <SelectValue placeholder="Seleccionar equipo" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="min-h-[40px]"
              onClick={() => setMoving(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-h-[40px] font-semibold"
              onClick={moveTeam}
            >
              Confirmar Traspaso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isFreeAgent && (
        <ReleasePlayerModal
          player={playerForRelease}
          currentTeam={currentTeam}
          open={releasing}
          onOpenChange={setReleasing}
        />
      )}
    </div>
  );
}
