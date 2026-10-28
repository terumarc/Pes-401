export const dynamic = "force-dynamic";

import Link from "next/link";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TABLE_SECTIONS } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { getGoals } from "@/lib/data/stats";
import { topScorers } from "@/lib/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<{ all?: string }> };

export default async function ScorersPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const { all } = await searchParams;
  const allTime = all === "1";
  const [goals, teams] = await Promise.all([
    getGoals(league.id, allTime ? undefined : league.season),
    getTeamsByLeague(league.id),
  ]);
  const scorers = topScorers(goals);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Tabla" />
      <SegmentedNav label="Secciones de la tabla" items={TABLE_SECTIONS} current="/scorers" />

      <div className="mb-4 flex gap-2">
        {[
          { href: "/scorers", label: `Temporada ${league.season}`, active: !allTime },
          { href: "/scorers?all=1", label: "Histórico", active: allTime },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            aria-current={c.active ? "page" : undefined}
            className={cn("flex h-8 items-center rounded-full px-3.5 text-[length:min(0.8824rem,22.5px)] font-semibold", c.active ? "bg-white text-black" : "bg-card")}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {scorers.length === 0 ? (
        <div className="rounded-[22px] bg-card px-6 py-10 text-center">
          <p className="text-[length:min(1rem,25.5px)] font-semibold">Todavía no hay goles</p>
          <p className="mx-auto mt-1 max-w-xs text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
            Al apuntar un resultado en Partidos, elige quién marcó cada gol.
          </p>
        </div>
      ) : (
        <ol className="overflow-hidden rounded-[22px] bg-card">
          {scorers.slice(0, 50).map((s, i) => {
            const team = teamById.get(s.teamId);
            const row = (
              <>
                <span className="w-6 shrink-0 text-center text-[length:min(0.8824rem,22.5px)] font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="flex size-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#2c2c2e]">
                  <PixelAvatar
                    seed={s.playerId ?? s.name}
                    shirt={team?.primary_color}
                    trim={team?.secondary_color}
                    className="size-full translate-y-[12%] scale-110"
                  />
                </span>
                <span className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border py-2 pr-4 group-last:border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[length:min(1rem,25.5px)] leading-tight">{s.name}</span>
                    <span className="block truncate text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{team?.name ?? "—"}</span>
                  </span>
                  <span className="text-[length:min(1.2941rem,33px)] font-bold tabular-nums">{s.goals}</span>
                </span>
              </>
            );
            return (
              <li key={`${s.playerId ?? s.name}-${s.teamId}`} className="group">
                {s.playerId ? (
                  <Link href={`/players/${s.playerId}`} className="flex items-center gap-3 pl-3 active:bg-white/[0.06]">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 pl-3">{row}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
