import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { CardThumb } from "@/components/cards/PlayingCard";
import { cardPixel } from "@/components/cards/fonts";
import { DECK_LABEL, FACTION_SHORT, signedMillions, type CardDraw } from "@/lib/cards";
import { cn } from "@/lib/utils";

/** Lista agrupada de cartas, al estilo de las listas de iOS. `showClub` para el feed de toda la liga. */
export function CardList({ cards, showClub }: { cards: CardDraw[]; showClub?: boolean }) {
  return (
    <ul className={cn(cardPixel.variable, "overflow-hidden rounded-[22px] bg-card")}>
      {cards.map((c) => {
        const legendary = c.rarity === "legendario";
        const meta = [
          legendary ? `${DECK_LABEL[c.deck]} legendaria` : DECK_LABEL[c.deck],
          showClub ? c.matchLabel : ago(c.createdAt),
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={c.id} className="flex gap-3 border-b border-border/70 py-3 pr-4 pl-3.5 last:border-0">
            <CardThumb deck={c.deck} legendary={legendary} />
            <div className="min-w-0 flex-1">
              {showClub && (
                <div className="flex items-center gap-2">
                  <span className="truncate text-[length:min(0.8824rem,22.5px)] font-semibold">{c.teamName}</span>
                  {c.faction && (
                    <span className="shrink-0 rounded-[4px] border border-[#48484a] px-[5px] py-px font-[family-name:var(--font-card-pixel)] text-[12px] text-[#c7c7cc]">
                      {FACTION_SHORT[c.faction]}
                    </span>
                  )}
                  <span className="grow" />
                  <Amount value={c.amount} />
                </div>
              )}
              <div className="flex items-start gap-3">
                <p className={cn("line-clamp-2 flex-1 text-[length:min(0.8824rem,22.5px)] leading-snug", showClub ? "mt-1 text-[#e5e5ea]" : "")}>
                  {c.text}
                </p>
                {!showClub && <Amount value={c.amount} />}
              </div>
              <p className="mt-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{meta}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ago(iso: string) {
  const date = new Date(iso);
  if (Date.now() - date.getTime() < 60_000) return "ahora";
  return formatDistanceToNowStrict(date, { locale: es, addSuffix: true });
}

function Amount({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "shrink-0 text-[length:min(0.8824rem,22.5px)] font-semibold tabular-nums",
        value > 0 ? "text-[#30d158]" : value < 0 ? "text-[#ff6961]" : "text-muted-foreground",
      )}
    >
      {signedMillions(value)}
    </span>
  );
}
