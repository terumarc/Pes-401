import Link from "next/link";
import { Users, Star, ArrowRight, User, Wallet, TrendingUp, TrendingDown, Minus, Coins } from "lucide-react";
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
  const isFirst = team.position === 1;
  const isSecond = team.position === 2;
  const isThird = team.position === 3;
  const isPodium = team.position <= 3;

  // Rank change calculation
  const rankDelta =
    team.previous_position != null && team.previous_position !== team.position
      ? team.previous_position - team.position
      : null;

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.22] hover:bg-card/90 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.5)] focus-within:ring-2 focus-within:ring-primary/40">
      {/* BANNER SUPERIOR CON GRADIENTE DE COLOR DEL CLUB */}
      <div
        className="relative h-22 w-full p-3.5 transition-opacity"
        style={{
          background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color || "#0C1222"} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
        {/* Top hairline reflection */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "font-display text-xs font-black tracking-wider uppercase backdrop-blur-md shadow-xs transition-transform group-hover:scale-102",
                isFirst
                  ? "border-amber-400/50 bg-amber-500/25 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : isSecond
                  ? "border-slate-300/50 bg-slate-300/20 text-slate-100"
                  : isThird
                  ? "border-amber-700/50 bg-amber-700/25 text-amber-200"
                  : "border-white/15 bg-black/40 text-white/90"
              )}
            >
              #{padPosition(team.position)} Clasificación
            </Badge>

            {rankDelta !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-md",
                  rankDelta > 0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                )}
                title={`Cambio de puesto: ${rankDelta > 0 ? `+${rankDelta}` : rankDelta}`}
              >
                {rankDelta > 0 ? (
                  <TrendingUp className="size-2.5" />
                ) : (
                  <TrendingDown className="size-2.5" />
                )}
                <span className="tabular-nums">{Math.abs(rankDelta)}</span>
              </span>
            )}
          </div>

          <span className="rounded-md bg-black/40 px-2 py-0.5 font-display text-[11px] font-bold tracking-widest text-white/90 uppercase border border-white/10 backdrop-blur-xs">
            {team.short_name}
          </span>
        </div>
      </div>

      <CardContent className="relative space-y-4 px-5 pt-0 pb-5">
        {/* ESCUDO DEL EQUIPO FLOTANTE Y MEDIA */}
        <div className="-mt-10 flex items-end justify-between">
          <div className="rounded-full bg-card p-1.5 shadow-xl ring-2 ring-white/[0.12] transition-transform duration-300 group-hover:scale-105 group-hover:ring-primary/40">
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
                  "font-display text-sm font-extrabold tabular-nums transition-shadow",
                  team.avg_overall >= 80
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
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
          <Link
            href={`/teams/${team.id}`}
            className="block truncate font-display text-xl font-black tracking-tight uppercase text-foreground transition-colors group-hover:text-primary outline-none focus-visible:underline"
          >
            {team.name}
          </Link>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <User className="size-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{team.owner_name?.trim() || "Sin propietario asignado"}</span>
          </p>
        </div>

        {/* GRID DE ESTADÍSTICAS VISUALES */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <Wallet className="size-3 text-primary shrink-0" />
              <span>Presupuesto</span>
            </div>
            <p className="mt-1 font-display text-sm font-bold text-foreground tabular-nums">
              <BudgetDisplay amount={team.budget} size="sm" />
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <Coins className="size-3 text-emerald-400 shrink-0" />
              <span>Valor Plantilla</span>
            </div>
            <p className="mt-1 font-display text-sm font-bold text-foreground tabular-nums">
              {team.squad_value ? (
                <BudgetDisplay amount={team.squad_value} size="sm" />
              ) : (
                <span className="text-muted-foreground font-normal">0M €</span>
              )}
            </p>
          </div>

          <div className="col-span-2 border-t border-white/[0.06] pt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <Users className="size-3 text-primary shrink-0" />
              <span>Plantilla:</span>
            </div>
            <span className="font-display text-xs font-bold text-foreground tabular-nums">
              {team.player_count ?? 0} futbolistas
            </span>
          </div>

          {team.top_player && (
            <div className="col-span-2 border-t border-white/[0.06] pt-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                  <Star className="size-3 text-amber-400" />
                  <span>Estrella:</span>
                </span>
                <span className="truncate font-display text-xs font-bold text-foreground">
                  {team.top_player.name}{" "}
                  <span className="text-amber-400">({team.top_player.overall} OVR)</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN DE ACCIÓN */}
        <Button
          asChild
          className="w-full justify-between font-display font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition-all duration-200 h-10 px-4 rounded-xl cursor-pointer"
        >
          <Link href={`/teams/${team.id}`} className="flex items-center justify-between w-full text-white">
            <span className="text-white font-bold">Ver Plantilla Completa</span>
            <ArrowRight className="size-4 text-white transition-transform duration-200 group-hover:translate-x-1" />
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
