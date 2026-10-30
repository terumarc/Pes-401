import { CardArt } from "@/components/cards/CardArt";
import { cardBody, cardDisplay, cardPixel } from "@/components/cards/fonts";
import { cardOrder, DECK_LABEL, FACTION_LABEL, RARITY_LABEL, type CardDraw, type Deck } from "@/lib/cards";
import { cn } from "@/lib/utils";

const INK = "#1B1A17";
const PAPER = "#F4EEDC";
export const DECK_COLOR: Record<Deck, string> = { suerte: "#E8741C", cajab: "#1F6F5C" };
const DECK_INK: Record<Deck, string> = { suerte: INK, cajab: PAPER };

const fontVars = cn(cardDisplay.variable, cardBody.variable, cardPixel.variable);

/** Dorso: el mazo boca abajo. */
export function CardBack({ deck, className }: { deck: Deck; className?: string }) {
  return (
    <div
      className={cn(fontVars, "size-full rounded-[18px] p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.55)]", className)}
      style={{ background: DECK_COLOR[deck] }}
    >
      <div
        className="flex size-full flex-col items-center justify-between rounded-[11px] border-2 py-[22px]"
        style={{
          borderColor: INK,
          backgroundImage: "radial-gradient(rgba(27,26,23,.22) 1.4px, transparent 1.6px)",
          backgroundSize: "12px 12px",
        }}
      >
        <span className="font-[family-name:var(--font-card-display)] text-[24px] tracking-[0.14em]" style={{ color: DECK_INK[deck] }}>
          {DECK_LABEL[deck].toUpperCase()}
        </span>
        <span
          aria-hidden
          className="-mt-2.5 -rotate-[9deg] font-[family-name:var(--font-card-display)] text-[200px] leading-none"
          style={{ color: DECK_INK[deck] }}
        >
          {deck === "suerte" ? "?" : "B"}
        </span>
        <span className="font-[family-name:var(--font-card-pixel)] text-[13px] tracking-[0.06em]" style={{ color: DECK_INK[deck] }}>
          CANI LEAGUE
        </span>
      </div>
    </div>
  );
}

/** Cara: el texto de la carta y lo que hay que pagar o cobrar. */
export function CardFront({ card, className }: { card: CardDraw; className?: string }) {
  const legendary = card.rarity === "legendario";
  const order = cardOrder(card);
  const receives = card.amount > 0;
  const chips = [card.faction ? FACTION_LABEL[card.faction].toUpperCase() : "TODA LA LIGA", RARITY_LABEL[card.rarity].toUpperCase()];

  const face = (
    <div className="size-full rounded-[18px] p-2.5" style={{ background: PAPER }}>
      <div className="flex size-full flex-col items-center overflow-hidden rounded-[11px] border-2" style={{ borderColor: INK }}>
        <div
          className="flex h-[54px] w-full shrink-0 items-center justify-center border-b-2"
          style={{ background: DECK_COLOR[card.deck], borderColor: INK }}
        >
          <span className="font-[family-name:var(--font-card-display)] text-[24px] tracking-[0.14em]" style={{ color: DECK_INK[card.deck] }}>
            {DECK_LABEL[card.deck].toUpperCase()}
          </span>
        </div>
        <div className="mt-3.5 flex gap-1.5">
          {chips.map((c, i) => (
            <span
              key={c}
              className="rounded-[4px] border-[1.5px] px-1.5 py-0.5 font-[family-name:var(--font-card-pixel)] text-[12px]"
              style={{ borderColor: INK, color: INK, background: legendary && i === 1 ? "#E8B730" : undefined }}
            >
              {c}
            </span>
          ))}
        </div>
        <CardArt icon={card.icon} size={96} className="mt-4 shrink-0" />
        <p
          className="mt-4 px-5 text-center font-[family-name:var(--font-card-body)] text-[15px] font-medium leading-[1.38]"
          style={{ color: INK }}
        >
          {card.text}
        </p>
        <div className="grow" />
        <div className="flex w-full flex-col items-center gap-1 border-t-2 border-dashed px-3 pt-3 pb-3.5" style={{ borderColor: INK }}>
          <span
            className={cn(
              "text-center font-[family-name:var(--font-card-display)] leading-[1.05]",
              order.length > 18 ? "text-[22px]" : "text-[30px]",
            )}
            style={{ color: card.amount === 0 ? INK : receives ? "#1F6F4A" : "#A3261C" }}
          >
            {order}
          </span>
          <span className="font-[family-name:var(--font-card-pixel)] text-[12px]" style={{ color: "#5A5446" }}>
            CANI LEAGUE
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        fontVars,
        "size-full rounded-[21px] shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
        legendary && "bg-[conic-gradient(from_200deg,#E8B730,#F6E7A8,#9AD3C9,#C7A6F0,#F2A7B5,#E8B730)] p-[3px]",
        className,
      )}
    >
      {face}
    </div>
  );
}

/** Miniatura del mazo para las listas. */
export function CardThumb({ deck, legendary }: { deck: Deck; legendary?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(fontVars, "flex h-[42px] w-[30px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px]")}
      style={{ background: DECK_COLOR[deck], borderColor: legendary ? "#E8B730" : INK }}
    >
      <span className="font-[family-name:var(--font-card-display)] text-[18px]" style={{ color: DECK_INK[deck] }}>
        {deck === "suerte" ? "?" : "B"}
      </span>
    </span>
  );
}
