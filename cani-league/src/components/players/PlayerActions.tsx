"use client";

import { useConfirm } from "@/components/ui/use-confirm";
import { canActFor, useViewer } from "@/components/auth/ViewerProvider";

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
  variant?: "default" | "compact" | "icon";
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
  const [confirm, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [moving, setMoving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [teamId, setTeamId] = useState(currentTeamId);
  const viewer = useViewer();
  const isAdmin = !!viewer?.isAdmin;
  // Poner en el mercado o liberar: su club o un admin. Editar, mover y borrar: solo admins.
  const owns = canActFor(viewer, currentTeamId);

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
    await updatePlayerClient(playerId, { team_id: teamId, contract_seasons_left: null });
    setMoving(false);
    startTransition(() => router.refresh());
  }

  async function toggleMarket() {
    await setPlayerMarketClient(playerId, !availableInMarket);
    startTransition(() => router.refresh());
  }

  async function remove() {
    const ok = await confirm({
      title: `Eliminar a ${playerForRelease.name}`,
      description: "Se borra el jugador de la base de datos. No se puede deshacer.",
      confirmLabel: "Eliminar jugador",
      destructive: true,
    });
    if (!ok) return;
    await deletePlayerClient(playerId);
    startTransition(() => {
      router.push("/players");
      router.refresh();
    });
  }

  // --- MODO COMPACTO (Para tarjetas en listas y cuadrículas) ---
  if (variant === "compact" || variant === "icon") {
    return (
      <div className="flex items-center gap-1.5">
        {variant === "compact" && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/players/${playerId}`}>Ver ficha</Link>
          </Button>
        )}

        {(isAdmin || owns) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant === "icon" ? "ghost" : "outline"}
              className="size-11 p-0 text-muted-foreground"
              aria-label={`Opciones de gestión para ${playerForRelease.name}`}
            >
              <MoreHorizontal className="size-4 text-foreground/80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-1.5">
            {isAdmin && (
            <>
            <DropdownMenuItem asChild>
              <Link
                href={`/players/${playerId}?edit=1`}
                className="flex items-center gap-2.5 cursor-pointer py-2.5 text-[length:min(0.8824rem,22.5px)]"
              >
                <Edit3 className="size-4 text-muted-foreground" />
                <span>Editar jugador</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setMoving(true)}
              className="flex items-center gap-2.5 cursor-pointer py-2.5 text-[length:min(0.8824rem,22.5px)]"
            >
              <ArrowRightLeft className="size-4 text-muted-foreground" />
              <span>Mover de equipo</span>
            </DropdownMenuItem>
            </>
            )}

            {owns && (
            <DropdownMenuItem
              onClick={toggleMarket}
              className="flex items-center gap-2.5 cursor-pointer py-2.5 text-[length:min(0.8824rem,22.5px)]"
            >
              <Store className="size-4 text-muted-foreground" />
              <span>{availableInMarket ? "Retirar de mercado" : "Poner en mercado"}</span>
            </DropdownMenuItem>
            )}

            {!isFreeAgent && owns && (
              <DropdownMenuItem
                onClick={() => setReleasing(true)}
                className="flex items-center gap-2.5 cursor-pointer py-2 text-[length:min(0.8824rem,22.5px)]"
              >
                <Coins className="size-4" />
                <span>Liberar (+30% valor)</span>
              </DropdownMenuItem>
            )}

            {isAdmin && (
            <>
            <DropdownMenuSeparator className="my-1 bg-white/[0.08]" />

            <DropdownMenuItem
              onClick={remove}
              className="flex items-center gap-2.5 cursor-pointer py-2.5 text-[length:min(0.8824rem,22.5px)] text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              <span>Eliminar jugador</span>
            </DropdownMenuItem>
            </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        {/* Modal de Mover Equipo Accesible */}
        <Dialog open={moving} onOpenChange={setMoving}>
          <DialogContent className="border-0 bg-card p-5 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[length:min(1.1765rem,30px)] font-bold">
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
                <SelectTrigger id="team-select-compact" className="w-full">
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
                className=""
                onClick={() => setMoving(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="font-semibold"
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
        {confirmDialog}
      </div>
    );
  }

  // --- MODO DEFAULT (Para la página de perfil /players/[id]) ---
  if (!isAdmin && !owns) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {isAdmin && (
      <>
      <Button
        variant="outline"
        className="px-4 gap-2  font-medium"
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
        className="px-4 gap-2  font-medium"
        onClick={() => setMoving(true)}
      >
        <ArrowRightLeft className="size-4 text-muted-foreground" />
        Mover de equipo
      </Button>
      </>
      )}

      <MarketToggle
        playerId={playerId}
        available={availableInMarket}
        className="px-4 "
      />

      {!isFreeAgent && (
        <Button
          type="button"
          variant="outline"
          className="px-4 gap-2  font-semibold"
          onClick={() => setReleasing(true)}
        >
          <Coins className="size-4" />
          Liberar (+30%)
        </Button>
      )}

      {isAdmin && (
      <Button
        type="button"
        variant="destructive"
        className="px-4 gap-2  font-medium"
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
      )}

      {/* Modal de Mover Equipo Accesible */}
      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="border-0 bg-card p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[length:min(1.1765rem,30px)] font-bold">
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
              <SelectTrigger id="team-select-full" className="w-full">
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
              className=""
              onClick={() => setMoving(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="font-semibold"
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
      {confirmDialog}
    </div>
  );
}
