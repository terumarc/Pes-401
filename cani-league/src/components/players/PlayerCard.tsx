import Link from "next/link";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatStat } from "@/lib/format/stats";
import { getPlayerTier } from "@/lib/players";
import type { Player, Team } from "@/types";

type PlayerCardProps = {
  player: Player & { team?: Pick<Team, "id" | "name" | "primary_color"> };
  href?: string;
};

export function PlayerCard({ player, href }: PlayerCardProps) {
  const tierInfo = getPlayerTier(player.overall);

  const content = (
    <Card size="sm" className="transition hover:ring-foreground/20">
      <CardContent className="flex items-center gap-3 sm:gap-4">
        <PlayerAvatar name={player.name} photoUrl={player.photo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold tracking-tight flex items-center gap-2">
                {player.name}
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${tierInfo.bgColor} ${tierInfo.color}`}>
                  {tierInfo.tier}
                </span>
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{player.position}</span>
                {player.team ? <span>· {player.team.name}</span> : null}
                {player.available_in_market ? (
                  <Badge variant="secondary">Mercado</Badge>
                ) : null}
              </p>
            </div>
            <span className="font-display text-xl font-semibold tabular-nums">
              {formatStat(player.overall)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Valor <BudgetDisplay amount={player.market_value} size="sm" />
            </span>
            <span>
              Fichaje <BudgetDisplay amount={player.transfer_price} size="sm" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
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
