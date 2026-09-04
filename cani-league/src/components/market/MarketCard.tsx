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
import { getPlayerTier } from "@/lib/players";
import { ArrowRight, Eye } from "lucide-react";
import type { Player, Team } from "@/types";

type MarketCardProps = {
  player: Player & { team?: Pick<Team, "id" | "name"> | null };
  teams: Team[];
};

export function MarketCard({ player, teams }: MarketCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<"clausula" | "mercado">("clausula");
  const tierInfo = getPlayerTier(player);

  const isFreeAgent =
    !player.team_id ||
    !player.team ||
    player.team.name.toLowerCase().includes("libre") ||
    player.team.name.toLowerCase().includes("sin equipo");

  const clausePrice = player.clause_fee ?? player.transfer_price;

  return (
    <>
      <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:hover:shadow-primary/5">
        <CardHeader className="flex-row items-start gap-4 space-y-0 pb-3">
          <PlayerAvatar name={player.name} photoUrl={player.photo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color}`}>
                {tierInfo.tier}
              </span>
              <span className="rounded px-1.5 py-0.5 text-[11px] font-bold bg-muted text-foreground/80">
                {player.position}
              </span>
            </div>
            <h3 className="mt-1.5 font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
              {player.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {player.team?.name || "Sin Equipo"} {player.nationality ? `· ${player.nationality}` : ""}
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-foreground">
                {formatStat(player.overall)}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Media
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Separator className="mb-3 border-border/40" />
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Valor Mercado</dt>
              <dd className="font-medium text-foreground">
                <BudgetDisplay amount={player.market_value} size="sm" />
              </dd>
            </div>
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground font-medium">
                {isFreeAgent ? "Coste Fichaje" : "Precio Cláusula"}
              </dt>
              <dd className="font-semibold text-foreground">
                <BudgetDisplay amount={isFreeAgent ? player.transfer_price : clausePrice} size="sm" />
              </dd>
            </div>
          </dl>
        </CardContent>

        <CardFooter className="gap-2 pt-0">
          {isFreeAgent ? (
            <Button
              id={`fichar-mercado-${player.id}`}
              size="sm"
              className="flex-1 gap-1.5 font-semibold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setPurchaseType("mercado");
                setModalOpen(true);
              }}
            >
              Fichar (Mercado) <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              id={`fichar-clausula-${player.id}`}
              size="sm"
              className="flex-1 gap-1.5 font-semibold shadow-xs"
              onClick={() => {
                setPurchaseType("clausula");
                setModalOpen(true);
              }}
            >
              Fichar (Cláusula) <ArrowRight className="size-3.5" />
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
            <Link href={`/players/${player.id}`}>
              <Eye className="size-3.5" /> Ver Ficha
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <TransferModal
        player={player}
        teams={teams}
        open={modalOpen}
        onOpenChange={setModalOpen}
        purchaseType={purchaseType}
      />
    </>
  );
}
