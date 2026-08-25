import Link from "next/link";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { padPosition } from "@/lib/format/stats";
import type { TeamWithStanding } from "@/types";

type TeamCardProps = {
  team: TeamWithStanding;
};

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Card className="relative overflow-hidden pt-0">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: team.primary_color }}
      />
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <p className="font-display text-3xl font-semibold tracking-tight text-muted-foreground tabular-nums">
          {padPosition(team.position)}
        </p>
        <TeamLogo
          name={team.name}
          logoUrl={team.logo_url}
          color={team.primary_color}
        />
      </CardHeader>
      <CardContent>
        <h3 className="font-display text-xl font-semibold tracking-tight uppercase">
          {team.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {team.owner_name?.trim() || "Sin propietario"}
        </p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Presupuesto
            </p>
            <BudgetDisplay amount={team.budget} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground">
            {team.player_count ?? 0} jugadores
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/teams/${team.id}`}>Ver equipo</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function TeamLogo({
  name,
  logoUrl,
  color,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "size-9 text-xs"
      : size === "lg"
        ? "size-16 text-lg"
        : "size-12 text-sm";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-border`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full font-display font-semibold text-white`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
