export const dynamic = "force-dynamic";

import { ChevronDown, Skull } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MATCH_SECTIONS, SegmentedNav } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { NecroporraEditor } from "@/components/necroporra/NecroporraEditor";
import { TeamLogo } from "@/components/teams/TeamCard";
import { getPrimaryLeague } from "@/lib/data/league";
import { getNecroporra, type NecroEntry } from "@/lib/data/necroporra";
import { EXACT_POINTS, NEAR_POINTS, PRIZE_PER_POINT, WINNER_BONUS } from "@/lib/necroporra";
import { formatMoneyShort } from "@/lib/format/money";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Team } from "@/types";

const body = "text-[length:min(0.8824rem,22.5px)]";
const small = "text-[length:min(0.7647rem,19.5px)]";
const h2 = "mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight";

export default async function NecroporraPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const [league, viewer] = await Promise.all([getPrimaryLeague(), getViewer()]);
  if (!league) return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const porra = await getNecroporra(league, viewer?.memberId ?? null);
  const byId = new Map(porra.clubs.map((c) => [c.id, c]));
  const status = porra.finished ? "Temporada acabada" : porra.locked ? "Cerrada" : "Abierta";

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Partidos" />
      <SegmentedNav label="Competiciones" items={MATCH_SECTIONS} current="/necroporra" />

      {/* Esquela: marco doble, como las de los periódicos. */}
      <section aria-labelledby="necro-title" className="mb-8 rounded-[22px] bg-card p-1.5">
        <div className="rounded-[17px] border border-white/15 px-5 py-6 text-center">
          <Skull className="mx-auto size-7 text-muted-foreground" strokeWidth={1.6} aria-hidden />
          <h2 id="necro-title" className="mt-2 text-[length:min(1.6471rem,42px)] font-bold leading-tight tracking-tight">
            La Necroporra
          </h2>
          <p className={cn(small, "mt-0.5 font-semibold uppercase tracking-[0.12em] text-muted-foreground")}>
            Temporada {porra.season} · {status}
          </p>
          <p className={cn(body, "mx-auto mt-3 max-w-sm leading-snug text-muted-foreground")}>
            {porra.locked
              ? porra.finished
                ? "Aquí yacen las predicciones de la temporada. Los puntos ya son los definitivos."
                : "Las porras quedaron enterradas con el primer partido. Los puntos se cuentan con la tabla de hoy."
              : "Ordena cómo crees que acabará la liga. Se cierra con el primer partido y hasta entonces nadie ve la tuya."}
          </p>
          <p className={cn(small, "mx-auto mt-3 max-w-sm text-muted-foreground")}>
            {EXACT_POINTS} puntos por puesto exacto · {NEAR_POINTS} si te quedas a uno · tu club no puntúa
          </p>
          <p className={cn(small, "mx-auto mt-1 max-w-sm text-muted-foreground")}>
            Al acabar la liga, tu club cobra {formatMoneyShort(PRIZE_PER_POINT)} por punto y quien gane la porra se lleva{" "}
            {formatMoneyShort(WINNER_BONUS)} más.
          </p>
        </div>
      </section>

      {!porra.locked ? (
        <>
          <section aria-labelledby="necro-mine" className="mb-8">
            <h2 id="necro-mine" className={h2}>
              Tu porra
            </h2>
            {viewer ? (
              <NecroporraEditor
                leagueId={league.id}
                clubs={porra.clubs}
                initial={porra.mine ?? porra.table}
                ownTeamId={viewer.teamId}
                hasSaved={!!porra.mine}
              />
            ) : (
              <p className={cn(body, "rounded-[22px] bg-card px-5 py-6 text-center text-muted-foreground")}>
                Entra con tu club para hacer la porra.
              </p>
            )}
          </section>

          <section aria-labelledby="necro-entrants">
            <h2 id="necro-entrants" className={h2}>
              Ya la han hecho
            </h2>
            {porra.entrants.length === 0 ? (
              <p className={cn(body, "px-1 text-muted-foreground")}>Nadie todavía.</p>
            ) : (
              <ul className="overflow-hidden rounded-[22px] bg-card">
                {porra.entrants.map((e) => (
                  <li key={e.memberId} className="flex min-h-[52px] items-center gap-3 border-b border-border px-4 last:border-b-0">
                    <ClubBadge team={e.teamId ? byId.get(e.teamId) : undefined} />
                    <span className={cn(body, "font-semibold")}>{e.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : porra.board.length === 0 ? (
        <div className="rounded-[22px] bg-card px-5 py-8 text-center">
          <p className="text-[length:min(1rem,25.5px)] font-semibold">Nadie hizo la porra esta temporada</p>
          <p className={cn(body, "mx-auto mt-1 max-w-sm text-muted-foreground")}>
            Se vuelve a abrir al empezar la siguiente, hasta que se juegue el primer partido.
          </p>
        </div>
      ) : (
        <section aria-labelledby="necro-board">
          <h2 id="necro-board" className={h2}>
            {porra.finished ? "Clasificación final" : "Si la liga acabara hoy"}
          </h2>
          <ol className="overflow-hidden rounded-[22px] bg-card">
            {porra.board.map((entry, i) => (
              <BoardRow key={entry.memberId} entry={entry} rank={i + 1} byId={byId} mine={entry.memberId === viewer?.memberId} />
            ))}
          </ol>
          <p className={cn(small, "mt-2 px-1 text-muted-foreground")}>Toca una porra para ver qué puso cada uno.</p>
        </section>
      )}
    </div>
  );
}

function ClubBadge({ team }: { team?: Team }) {
  if (!team) return <span aria-hidden className="size-7 shrink-0 rounded-full bg-input" />;
  return <TeamLogo name={team.name} logoUrl={team.logo_url} color={team.primary_color} size="xs" />;
}

function BoardRow({ entry, rank, byId, mine }: { entry: NecroEntry; rank: number; byId: Map<string, Team>; mine: boolean }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <details className="group">
        <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-3 active:bg-white/5 [&::-webkit-details-marker]:hidden">
          <span
            className={cn(
              body,
              "w-6 shrink-0 text-center font-bold tabular-nums",
              rank === 1 ? "text-[#30d158]" : "text-muted-foreground",
            )}
          >
            {rank}
          </span>
          <ClubBadge team={entry.teamId ? byId.get(entry.teamId) : undefined} />
          <span className="min-w-0 flex-1">
            <span className={cn(body, "block truncate font-semibold leading-tight")}>
              {entry.name}
              {mine && <span className="font-normal text-muted-foreground"> · tú</span>}
            </span>
            <span className={cn("block text-[length:min(0.7059rem,18px)] text-muted-foreground")}>
              {entry.exact === 1 ? "1 puesto exacto" : `${entry.exact} puestos exactos`}
              {entry.prize > 0 && <span className="text-[#30d158]"> · +{formatMoneyShort(entry.prize)}</span>}
            </span>
          </span>
          <span className="text-[length:min(1.1765rem,30px)] font-bold tabular-nums">{entry.points}</span>
          <span className="sr-only">puntos</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="border-t border-border bg-black/15 py-1">
          {entry.picks.map((p) => {
            const t = byId.get(p.teamId);
            if (!t) return null;
            const own = p.teamId === entry.teamId;
            return (
              <li key={p.teamId} className="flex min-h-[44px] items-center gap-2 px-3">
                <span className={cn(small, "w-6 shrink-0 text-center font-semibold tabular-nums text-muted-foreground")}>{p.guess}</span>
                <TeamLogo name={t.name} logoUrl={t.logo_url} color={t.primary_color} size="xs" />
                <span className={cn(small, "min-w-0 flex-1 truncate")}>{t.short_name || t.name}</span>
                <span className={cn(small, "shrink-0 tabular-nums text-muted-foreground")}>
                  {p.actual != null ? `va ${p.actual}º` : ""}
                </span>
                <span
                  className={cn(
                    small,
                    "w-9 shrink-0 text-right font-semibold tabular-nums",
                    own
                      ? "text-muted-foreground"
                      : p.points === EXACT_POINTS
                        ? "text-[#30d158]"
                        : p.points === NEAR_POINTS
                          ? "text-[#ffd60a]"
                          : "text-muted-foreground",
                  )}
                >
                  {own ? "—" : `+${p.points}`}
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </li>
  );
}
