export const dynamic = "force-dynamic";

import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TABLE_SECTIONS } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { NewSeason } from "@/components/seasons/NewSeason";
import { suggestNextSeason } from "@/app/actions/seasons";
import { getPrimaryLeague } from "@/lib/data/league";
import { getSeasons } from "@/lib/data/stats";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

const TITLES: [string, string][] = [
  ["league", "Liga"],
  ["champions", "Champions"],
  ["cup", "Copa de Liga"],
  ["conference", "Conference"],
];

export default async function SeasonsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const [seasons, suggested, viewer] = await Promise.all([
    getSeasons(league.id),
    suggestNextSeason(league.season),
    getViewer(),
  ]);

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Tabla" />
      <SegmentedNav label="Secciones de la tabla" items={TABLE_SECTIONS} current="/seasons" />

      <section aria-label="Temporada en curso" className="mb-8 rounded-[22px] bg-card p-4">
        <p className="text-[13px] text-muted-foreground">Temporada en curso</p>
        <p className="mb-4 text-[28px] font-bold tracking-tight">{league.season}</p>
        {viewer?.isAdmin ? (
          <NewSeason leagueId={league.id} current={league.season} suggested={suggested} />
        ) : (
          <p className="text-[15px] text-muted-foreground">Un admin abre la temporada siguiente cuando acaba esta.</p>
        )}
      </section>

      <h2 className="mb-2 px-1 text-[20px] font-bold tracking-tight">Temporadas anteriores</h2>
      {seasons.length === 0 ? (
        <p className="rounded-[22px] bg-card px-4 py-8 text-center text-[15px] text-muted-foreground">
          Cuando cierres la temporada {league.season}, aparecerá aquí con su clasificación, campeones y goleadores.
        </p>
      ) : (
        <div className="space-y-3">
          {seasons.map((s) => (
            <details key={s.id} className="group overflow-hidden rounded-[22px] bg-card">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <p className="text-[20px] font-bold">{s.season}</p>
                  <p className="truncate text-[15px] text-muted-foreground">
                    Campeón: {s.champions.league?.name ?? "—"}
                    {s.top_scorers[0] ? ` · Pichichi: ${s.top_scorers[0].name} (${s.top_scorers[0].goals})` : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#5a5a5f] transition-transform group-open:rotate-90" aria-hidden />
              </summary>

              <div className="border-t border-border">
                <ul>
                  {TITLES.map(([k, l]) => (
                    <li key={k} className="flex justify-between gap-3 border-b border-border px-4 py-2.5 text-[15px]">
                      <span>{l}</span>
                      <span className="text-muted-foreground">{s.champions[k]?.name ?? "—"}</span>
                    </li>
                  ))}
                </ul>
                <p className="px-4 pb-1 pt-4 text-[13px] text-muted-foreground">Clasificación final</p>
                <ol>
                  {s.standings.map((r) => (
                    <li key={r.team_id} className="flex items-center gap-3 border-b border-border px-4 py-2 text-[15px] last:border-b-0">
                      <span className="w-5 text-muted-foreground tabular-nums">{r.position}</span>
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {r.won}-{r.drawn}-{r.lost}
                      </span>
                      <span className="w-9 text-right font-semibold tabular-nums">{r.points}</span>
                    </li>
                  ))}
                </ol>
                {s.top_scorers.length > 0 && (
                  <>
                    <p className="px-4 pb-1 pt-4 text-[13px] text-muted-foreground">Goleadores</p>
                    <ol className="pb-2">
                      {s.top_scorers.slice(0, 5).map((g, i) => (
                        <li key={i} className="flex justify-between gap-3 px-4 py-1.5 text-[15px]">
                          <span className="truncate">
                            {g.name} <span className="text-muted-foreground">· {g.team ?? ""}</span>
                          </span>
                          <span className="font-semibold tabular-nums">{g.goals}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
