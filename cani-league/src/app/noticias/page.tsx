export const dynamic = "force-dynamic";

import { CardList } from "@/components/cards/CardList";
import { PendingCardBanner } from "@/components/cards/PendingCardBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { MATCH_SECTIONS, SegmentedNav } from "@/components/layout/SegmentedNav";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { getLeagueCards } from "@/lib/data/cards";
import { getPrimaryLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { CardDraw } from "@/lib/cards";

const DAY = 24 * 60 * 60 * 1000;

/** Hoy, esta semana y antes, según cuándo se sacó la carta. */
function groups(cards: CardDraw[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const out: { title: string; cards: CardDraw[] }[] = [
    { title: "Hoy", cards: [] },
    { title: "Esta semana", cards: [] },
    { title: "Antes", cards: [] },
  ];
  for (const c of cards) {
    const t = new Date(c.createdAt).getTime();
    out[t >= startOfToday ? 0 : t >= startOfToday - 6 * DAY ? 1 : 2].cards.push(c);
  }
  return out.filter((g) => g.cards.length > 0);
}

export default async function NoticiasPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const league = await getPrimaryLeague();
  if (!league) return <p className="text-muted-foreground">No hay liga configurada.</p>;

  const cards = await getLeagueCards(league.id);

  return (
    <div className="animate-fade-up pb-12">
      <PageHeader title="Partidos" />
      <SegmentedNav label="Competiciones" items={MATCH_SECTIONS} current="/noticias" />
      <PendingCardBanner />

      {cards.length === 0 ? (
        <div className="rounded-[22px] bg-card px-5 py-8 text-center">
          <p className="text-[length:min(1rem,25.5px)] font-semibold">Todavía no hay noticias</p>
          <p className="mx-auto mt-1 max-w-sm text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
            Cada vez que se apunta un partido de liga, los dos clubes pueden sacar una carta de Suerte o de Caja B. Aquí
            salen en cuanto se giran.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groups(cards).map((g) => (
            <section key={g.title} aria-labelledby={`noticias-${g.title}`}>
              <h2 id={`noticias-${g.title}`} className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
                {g.title}
              </h2>
              <CardList cards={g.cards} showClub />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
