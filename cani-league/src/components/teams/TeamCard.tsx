import Link from "next/link";
import { Users, Star, ArrowRight, User, Wallet } from "lucide-react";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { padPosition } from "@/lib/format/stats";
import { cn } from "@/lib/utils";
import type { TeamWithStanding } from "@/types";

type TeamCardProps = {
  team: TeamWithStanding;
};

export function TeamCard({ team }: TeamCardProps) {
  const isPodium = team.position <= 3;
  const podiumColor =
    team.position === 1
      ? "bg-amber-400/20 text-amber-500 border-amber-400/40"
      : team.position === 2
        ? "bg-slate-300/20 text-slate-400 border-slate-300/40"
        : team.position === 3
          ? "bg-amber-700/20 text-amber-600 border-amber-700/40"
          : "bg-muted text-muted-foreground border-border";

  return (
    <Card className="group relative overflow-hidden border-border/80 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      {/* BANNER SUPERIOR CON GRADIENTE DE COLOR DEL CLUB */}
      <div
        className="relative h-20 w-full p-3.5 transition-opacity"
        style={{
          background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color || "#0C1222"} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />

        <div className="relative flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              "font-display text-xs font-black tracking-wider uppercase backdrop-blur-md",
              isPodium ? "border-white/40 bg-black/40 text-white" : "border-white/20 bg-black/30 text-white/90",
            )}
          >
            #{padPosition(team.position)} Clasificación
          </Badge>

          <span className="font-display text-xs font-bold tracking-widest text-white/80 uppercase">
            {team.short_name}
          </span>
        </div>
      </div>

      <CardContent className="relative space-y-4 px-5 pt-0 pb-5">
        {/* ESCUDO DEL EQUIPO FLOTANTE */}
        <div className="-mt-9 flex items-end justify-between">
          <div className="rounded-full bg-card p-1 shadow-md ring-2 ring-background">
            <TeamLogo
              name={team.name}
              logoUrl={team.logo_url}
              color={team.primary_color}
              size="lg"
            />
          </div>

          {team.avg_overall && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Media Plantilla
              </span>
              <Badge
                className={cn(
                  "font-display text-sm font-extrabold",
                  team.avg_overall >= 80
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : team.avg_overall >= 75
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                      : "bg-muted text-foreground border-border",
                )}
                variant="outline"
              >
                ★ {team.avg_overall} OVR
              </Badge>
            </div>
          )}
        </div>

        {/* NOMBRE Y PROPIETARIO */}
        <div>
          <h3 className="truncate font-display text-xl font-bold tracking-tight uppercase transition-colors group-hover:text-primary">
            {team.name}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3.5" />
            {team.owner_name?.trim() || "Sin propietario asignado"}
          </p>
        </div>

        {/* GRID DE ESTADÍSTICAS VISUALES */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-2.5 text-xs">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Wallet className="size-3 text-primary" />
              Presupuesto
            </div>
            <p className="mt-1 font-display text-sm font-bold text-foreground">
              <BudgetDisplay amount={team.budget} size="sm" />
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Users className="size-3 text-primary" />
              Jugadores
            </div>
            <p className="mt-1 font-display text-sm font-bold text-foreground">
              {team.player_count ?? 0} en plantilla
            </p>
          </div>

          {team.top_player && (
            <div className="col-span-2 border-t border-border/60 pt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Star className="size-3 text-amber-500" />
                  Estrella:
                </span>
                <span className="truncate font-display text-xs font-bold text-foreground">
                  {team.top_player.name} ({team.top_player.overall} OVR)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN DE ACCIÓN */}
        <Button asChild className="w-full justify-between font-display font-semibold transition-all">
          <Link href={`/teams/${team.id}`}>
            <span>Ver Plantilla</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
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
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "sm"
      ? "size-9 text-xs"
      : size === "lg"
        ? "size-14 text-base"
        : size === "xl"
          ? "size-20 text-xl"
          : "size-11 text-sm";

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
        className={`${sizeClass} rounded-full object-cover ring-2 ring-border shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full font-display font-bold text-white shadow-sm ring-1 ring-white/20`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
