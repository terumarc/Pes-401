"use client";

import { useState } from "react";
import Link from "next/link";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { PlayerAvatar } from "@/components/players/PlayerCard";
import { TransferModal } from "@/components/market/TransferModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatStat } from "@/lib/format/stats";
import type { Player, Team } from "@/types";

type MarketCardProps = {
  player: Player & { team: Pick<Team, "id" | "name"> };
  teams: Team[];
};

export function MarketCard({ player, teams }: MarketCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start gap-4 space-y-0">
          <PlayerAvatar name={player.name} photoUrl={player.photo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Jugador
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">
              {player.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {player.team.name} · {player.position}
            </p>
            <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
              {formatStat(player.overall)}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Valor</dt>
              <dd>
                <BudgetDisplay amount={player.market_value} size="sm" />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Precio de fichaje</dt>
              <dd>
                <BudgetDisplay amount={player.transfer_price} size="sm" />
              </dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            id={`fichar-${player.id}`}
            className="flex-1"
            onClick={() => setModalOpen(true)}
          >
            Fichar
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/players/${player.id}`}>Ver jugador</Link>
          </Button>
        </CardFooter>
      </Card>

      <TransferModal
        player={player}
        teams={teams}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
