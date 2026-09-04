import Link from "next/link";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatStat } from "@/lib/format/stats";
import {
  getPlayerTier,
  getPlayerEffectiveRating,
  getPlayerContractInfo,
  type PositionGroup,
} from "@/lib/players";
import type { Player, Team } from "@/types";

type PlayerCardProps = {
  player: Player & { team?: Pick<Team, "id" | "name" | "primary_color"> };
  href?: string;
  groupContext?: PositionGroup;
};

export function PlayerCard({ player, href, groupContext }: PlayerCardProps) {
  const tierInfo = getPlayerTier(player, undefined, undefined, groupContext);
  const mediaValue = getPlayerEffectiveRating(player);
  const contractInfo = getPlayerContractInfo(player);

  const content = (
    <Card size="sm" className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:hover:shadow-primary/5">
      <CardContent className="flex items-center gap-3.5 sm:gap-4 p-4">
        <PlayerAvatar name={player.name} photoUrl={player.photo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="truncate font-display text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {player.name}
                </h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color}`}>
                  {tierInfo.tier}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/60 flex items-center gap-1" title={`Contrato: ${contractInfo.durationLabel}`}>
                  <span>⏳</span>
                  <span>{contractInfo.duration} {contractInfo.duration === 1 ? "Temp." : "Temps."}</span>
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80 bg-muted/80 px-1.5 py-0.5 rounded text-[11px]">
                  {player.position}
                </span>
                {player.nationality ? (
                  <span className="text-muted-foreground font-medium">
                    · {player.nationality}
                  </span>
                ) : null}
                {player.team ? (
                  <span className="flex items-center gap-1.5">
                    <span 
                      className="size-2 rounded-full shrink-0" 
                      style={{ backgroundColor: player.team.primary_color || '#94a3b8' }} 
                    />
                    <span className="truncate max-w-[140px]">{player.team.name}</span>
                  </span>
                ) : null}
                {player.available_in_market ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Mercado
                  </Badge>
                ) : null}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatStat(mediaValue)}
              </span>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Media
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between border-t border-border/40 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Valor:</span>
              <span className="font-medium text-foreground">
                <BudgetDisplay amount={contractInfo.price} size="sm" />
              </span>
            </div>
            <div className="flex items-center gap-1.5" title={contractInfo.renewalPercent > 0 ? `Coste de renovación: ${contractInfo.renewalPercentLabel} (${contractInfo.renewalCostLabel})` : "Renovación gratuita"}>
              <span className="text-[11px]">Renovación:</span>
              <span className="font-semibold text-foreground">
                {contractInfo.renewalCost > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{contractInfo.renewalPercentLabel} ({contractInfo.renewalCostLabel})</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Gratis</span>
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
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "size-10 text-xs"
      : size === "lg"
        ? "size-20 text-xl"
        : "size-12 text-sm";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-xl object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl bg-accent font-display font-semibold text-accent-foreground`}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
