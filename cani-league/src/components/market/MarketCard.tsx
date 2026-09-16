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
import { getPlayerTier, getPlayerEffectiveRating, getPlayerContractInfo } from "@/lib/players";
import { ArrowRight, Eye, Sparkles } from "lucide-react";
import type { Player, Team } from "@/types";

type MarketCardProps = {
  player: Player & { team?: Pick<Team, "id" | "name"> | null };
  teams: Team[];
};

export function MarketCard({ player, teams }: MarketCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [purchaseType, setPurchaseType] = useState<"clausula" | "mercado">("clausula");
  const tierInfo = getPlayerTier(player);
  const mediaValue = getPlayerEffectiveRating(player);
  const contractInfo = getPlayerContractInfo(player);

  const isElite = mediaValue >= 88;

  const isFreeAgent =
    !player.team_id ||
    !player.team ||
    player.team.name.toLowerCase().includes("libre") ||
    player.team.name.toLowerCase().includes("sin equipo");

  return (
    <>
      <Card className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.22] hover:bg-card/90 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)]">
        {/* Top hairline light reflection */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="flex-row items-start gap-4 space-y-0 p-4 sm:p-5 pb-3">
          <PlayerAvatar name={player.name} photoUrl={player.photo_url} size="lg" isElite={isElite} />
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color} ring-1 ring-white/10 shadow-xs`}>
                  {tierInfo.tier}
                </span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/[0.03] text-muted-foreground border border-white/[0.08] flex items-center gap-1"
                  title={`Contrato: ${contractInfo.durationLabel}`}
                >
                  <span className="opacity-70">⏳</span>
                  <span>{contractInfo.duration} {contractInfo.duration === 1 ? "Temp." : "Temps."}</span>
                </span>
              </div>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-white/[0.06] border border-white/[0.08] text-foreground/90 uppercase tracking-wider">
                {player.position}
              </span>
            </div>

            <h3 className="mt-1.5 font-display text-base sm:text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
              {player.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {player.team?.name || "Sin Equipo"} {player.nationality ? `· ${player.nationality}` : ""}
            </p>
            
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`font-display text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
                isElite ? "text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.3)]" : "text-foreground"
              }`}>
                {formatStat(mediaValue)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Media
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-5 pt-0 pb-3">
          <Separator className="mb-3 bg-white/[0.06]" />
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Precio Fijo</dt>
              <dd className="font-semibold text-foreground tabular-nums">
                <BudgetDisplay amount={contractInfo.price} size="sm" />
              </dd>
            </div>
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Duración Contrato</dt>
              <dd className="font-medium text-foreground">
                {contractInfo.durationLabel}
              </dd>
            </div>
            <div className="flex justify-between items-center gap-3">
              <dt className="text-muted-foreground">Prima Renovación</dt>
              <dd className="font-semibold tabular-nums">
                {contractInfo.renewalCost > 0 ? (
                  <span className="text-amber-400 font-bold">
                    {contractInfo.renewalPercentLabel} ({contractInfo.renewalCostLabel})
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">
                    Gratis
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>

        <CardFooter className="gap-2 px-4 sm:px-5 pb-4 pt-0">
          {isFreeAgent ? (
            <Button
              id={`fichar-mercado-${player.id}`}
              size="sm"
              className="flex-1 gap-1.5 font-semibold text-xs shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
              onClick={() => {
                setPurchaseType("mercado");
                setModalOpen(true);
              }}
            >
              <Sparkles className="size-3.5" />
              <span>Fichar (Libre)</span>
            </Button>
          ) : (
            <Button
              id={`fichar-clausula-${player.id}`}
              size="sm"
              className="flex-1 gap-1.5 font-semibold text-xs shadow-xs border border-white/[0.1] hover:border-white/[0.2] transition-all"
              onClick={() => {
                setPurchaseType("clausula");
                setModalOpen(true);
              }}
            >
              <span>Fichar (Cláusula)</span>
              <ArrowRight className="size-3.5" />
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5 text-xs border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.06] transition-colors">
            <Link href={`/players/${player.id}`}>
              <Eye className="size-3.5 text-muted-foreground" /> Ver Ficha
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
