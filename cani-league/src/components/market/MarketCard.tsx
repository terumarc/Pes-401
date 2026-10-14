"use client";

import { useState } from "react";
import { TransferModal } from "@/components/market/TransferModal";
import { PlayerRow } from "@/components/fantasy/primitives";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format/money";
import { getPlayerContractInfo } from "@/lib/players";
import type { Player, Team } from "@/types";

type MarketCardProps = {
  player: Player & { team?: Pick<Team, "id" | "name"> | null };
  teams: Team[];
};

/** Fila del mercado: jugador, club, precio y botón de fichar (libre o por cláusula). */
export function MarketCard({ player, teams }: MarketCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const contractInfo = getPlayerContractInfo(player);

  const isFreeAgent =
    !player.team_id ||
    !player.team ||
    player.team.name.toLowerCase().includes("libre") ||
    player.team.name.toLowerCase().includes("sin equipo");

  const club = isFreeAgent ? "Agente libre" : player.team?.name;
  const contract =
    contractInfo.duration > 0
      ? `${contractInfo.duration} ${contractInfo.duration === 1 ? "temp." : "temps."}`
      : "sin contrato";

  return (
    <>
      <PlayerRow
        player={player}
        href={`/players/${player.id}`}
        subtitle={[club, player.nationality].filter(Boolean).join(" · ")}
        meta={
          <>
            {formatMoney(contractInfo.price)}
            <span className="font-normal text-muted-foreground"> · {contract}</span>
          </>
        }
        action={
          <Button
            id={isFreeAgent ? `fichar-mercado-${player.id}` : `fichar-clausula-${player.id}`}
            size="sm"
            variant={isFreeAgent ? "default" : "outline"}
            className="min-w-[4.75rem]"
            onClick={() => setModalOpen(true)}
            aria-label={
              isFreeAgent
                ? `Fichar a ${player.name} como agente libre`
                : `Pagar la cláusula de ${player.name}`
            }
          >
            {isFreeAgent ? "Fichar" : "Cláusula"}
          </Button>
        }
      />

      <TransferModal
        player={player}
        teams={teams}
        open={modalOpen}
        onOpenChange={setModalOpen}
        purchaseType={isFreeAgent ? "mercado" : "clausula"}
      />
    </>
  );
}
