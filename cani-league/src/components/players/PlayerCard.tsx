import Link from "next/link";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatStat } from "@/lib/format/stats";
import {
  getPlayerTier,
  getPlayerEffectiveRating,
  getPlayerContractInfo,
} from "@/lib/players";
import type { Player, Team } from "@/types";

type PlayerCardProps = {
  player: Player & { team?: Pick<Team, "id" | "name" | "primary_color"> };
  href?: string;
};

export function PlayerCard({ player, href }: PlayerCardProps) {
  const tierInfo = getPlayerTier(player);
  const mediaValue = getPlayerEffectiveRating(player);
  const contractInfo = getPlayerContractInfo(player);

  const isElite = mediaValue >= 88;

  const content = (
    <Card className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.22] hover:bg-card/90 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)]">
      {/* Stripe top-edge sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="flex items-center gap-3.5 p-4 sm:gap-4">
        <PlayerAvatar name={player.name} photoUrl={player.photo_url} isElite={isElite} />
        
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="truncate font-display text-sm sm:text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {player.name}
                </h3>
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

              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/90 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                  {player.position}
                </span>
                {player.nationality ? (
                  <span className="text-muted-foreground/80 font-medium">
                    · {player.nationality}
                  </span>
                ) : null}
                {player.team ? (
                  <span className="flex items-center gap-1.5">
                    <span 
                      className="size-2 rounded-full shrink-0 ring-1 ring-white/20" 
                      style={{ backgroundColor: player.team.primary_color || '#94a3b8' }} 
                    />
                    <span className="truncate max-w-[130px] font-medium text-foreground/80">{player.team.name}</span>
                  </span>
                ) : null}
                {player.available_in_market ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    Mercado
                  </Badge>
                ) : null}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className={`font-display text-2xl font-bold tabular-nums tracking-tight ${
                isElite ? "text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.3)]" : "text-foreground"
              }`}>
                {formatStat(mediaValue)}
              </span>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                Media
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between border-t border-white/[0.06] pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Valor:</span>
              <span className="font-semibold text-foreground tabular-nums">
                <BudgetDisplay amount={contractInfo.price} size="sm" />
              </span>
            </div>
            <div
              className="flex items-center gap-1.5"
              title={contractInfo.renewalPercent > 0 ? `Coste de renovación: ${contractInfo.renewalPercentLabel} (${contractInfo.renewalCostLabel})` : "Renovación gratuita"}
            >
              <span className="text-[11px] text-muted-foreground">Renovación:</span>
              <span className="font-semibold tabular-nums">
                {contractInfo.renewalCost > 0 ? (
                  <span className="text-amber-400 font-bold">{contractInfo.renewalPercentLabel} ({contractInfo.renewalCostLabel})</span>
                ) : (
                  <span className="text-emerald-400 font-bold">Gratis</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

export function PlayerAvatar({
  name,
  photoUrl: _photoUrl,
  size = "md",
  isElite = false,
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  isElite?: boolean;
}) {
  const sizeClass =
    size === "sm"
      ? "size-9 text-xs"
      : size === "lg"
        ? "size-16 text-lg font-bold"
        : "size-11 text-sm font-semibold";

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.1] via-white/[0.04] to-black/40 font-display text-foreground border border-white/[0.12] shadow-inner select-none ${
        isElite ? "ring-2 ring-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.15)]" : ""
      }`}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
