"use client";

import { ChevronRight } from "lucide-react";
import { usePendingCard } from "@/components/cards/CardsProvider";
import { CardThumb } from "@/components/cards/PlayingCard";
import { DECK_LABEL } from "@/lib/cards";

/** Recordatorio para girar la carta si se cerró la hoja sin hacerlo. */
export function PendingCardBanner() {
  const { pending, openCard } = usePendingCard();
  if (!pending) return null;
  return (
    <button
      type="button"
      onClick={openCard}
      className="mb-6 flex w-full items-center gap-3 rounded-[22px] bg-card py-3 pr-3 pl-3.5 text-left active:bg-secondary"
    >
      <CardThumb deck={pending.deck} />
      <span className="min-w-0 flex-1">
        <span className="block text-[length:min(0.8824rem,22.5px)] font-semibold">Tienes una carta de {DECK_LABEL[pending.deck]} por girar</span>
        <span className="block text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{pending.matchLabel ?? "Toca para verla"}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
