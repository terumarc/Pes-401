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

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.22] hover:bg-card/90 hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.45)]">
      {/* BANNER SUPERIOR CON GRADIENTE DE COLOR DEL CLUB */}
      <div
        className="relative h-20 w-full p-3.5 transition-opacity"
        style={{
          background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color || "#0C1222"} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
        {/* Top hairline reflection */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

        <div className="relative flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              "font-display text-xs font-black tracking-wider uppercase backdrop-blur-md",
              team.position === 1
                ? "border-amber-400/40 bg-amber-500/20 text-amber-200"
                : isPodium
                ? "border-blue-400/30 bg-blue-500/20 text-blue-200"
                : "border-white/20 bg-black/30 text-white/90"
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
          <div className="rounded-full bg-card p-1 shadow-lg ring-2 ring-white/[0.1]">
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
                  "font-display text-sm font-extrabold tabular-nums",
                  team.avg_overall >= 80
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : team.avg_overall >= 75
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    : "bg-white/[0.04] text-foreground border-white/[0.08]"
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
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <User className="size-3.5" />
            <span>{team.owner_name?.trim() || "Sin propietario asignado"}</span>
          </p>
        </div>

        {/* GRID DE ESTADÍSTICAS VISUALES */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Wallet className="size-3 text-primary" />
              <span>Presupuesto</span>
            </div>
            <p className="mt-1 font-display text-sm font-bold text-foreground tabular-nums">
              <BudgetDisplay amount={team.budget} size="sm" />
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Users className="size-3 text-primary" />
              <span>Jugadores</span>
            </div>
            <p className="mt-1 font-display text-sm font-bold text-foreground tabular-nums">
              {team.player_count ?? 0} en plantilla
            </p>
          </div>

          {team.top_player && (
            <div className="col-span-2 border-t border-white/[0.06] pt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Star className="size-3 text-amber-400" />
                  <span>Estrella:</span>
                </span>
                <span className="truncate font-display text-xs font-bold text-foreground">
                  {team.top_player.name} ({team.top_player.overall} OVR)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN DE ACCIÓN */}
        <Button asChild className="w-full justify-between font-display font-semibold transition-all group-hover:border-white/[0.2]">
          <Link href={`/teams/${team.id}`}>
            <span>Ver Plantilla</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
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
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white/[0.1] shadow-md`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full font-display font-bold text-white shadow-md ring-1 ring-white/20`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
