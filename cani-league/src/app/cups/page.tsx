export const dynamic = "force-dynamic";

import Link from "next/link";
import { CupBracket } from "@/components/cups/CupBracket";
import { NewCupMatchButton } from "@/components/cups/NewCupMatchButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { MATCH_SECTIONS, SegmentedNav } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { CUP_LABELS, CUP_TROPHIES, type CupTie, type CupTrophy } from "@/lib/cups";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { getCupTies } from "@/lib/data/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<{ c?: string }> };

export default async function CupsPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const { c } = await searchParams;
  const trophy: CupTrophy = (CUP_TROPHIES as readonly string[]).includes(c ?? "") ? (c as CupTrophy) : "champions";
  const [ties, teams] = await Promise.all([getCupTies(league.id, league.season), getTeamsByLeague(league.id)]);

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Partidos" actions={ties.some((t) => t.trophy === trophy) ? <NewCupMatchButton /> : undefined} />
      <SegmentedNav label="Competiciones" items={MATCH_SECTIONS} current="/cups" />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <div className="flex w-max gap-2">
          {CUP_TROPHIES.map((t) => (
            <Link
              key={t}
              href={`/cups?c=${t}`}
              aria-current={t === trophy ? "page" : undefined}
              className={cn("flex h-9 items-center rounded-full px-4 text-[length:min(0.8824rem,22.5px)] font-semibold", t === trophy ? "bg-white text-black" : "bg-card")}
            >
              {CUP_LABELS[t]}
            </Link>
          ))}
        </div>
      </div>

      <CupBracket
        key={trophy}
        leagueId={league.id}
        trophy={trophy}
        ties={(ties as CupTie[]).filter((t) => t.trophy === trophy)}
        teams={teams.map((t) => ({ id: t.id, name: t.name, short_name: t.short_name, logo_url: t.logo_url, primary_color: t.primary_color }))}
      />
    </div>
  );
}
