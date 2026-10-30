"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CardBack, CardFront, DECK_COLOR } from "@/components/cards/PlayingCard";
import { useViewer } from "@/components/auth/ViewerProvider";
import { getMyPendingCardAction, revealCardAction } from "@/app/actions/cards";
import { createClient } from "@/lib/supabase/client";
import { DECK_LABEL, formatMillions, signedMillions, type CardDraw } from "@/lib/cards";
import { cn } from "@/lib/utils";

type CardsContext = {
  /** Carta boca abajo del club de quien usa la app. */
  pending: CardDraw | null;
  openCard: () => void;
};

const Ctx = createContext<CardsContext>({ pending: null, openCard: () => {} });

export function usePendingCard() {
  return useContext(Ctx);
}

const SEEN_KEY = "cani:cards-shown";

function wasShown(id: string) {
  try {
    return sessionStorage.getItem(SEEN_KEY) === id;
  } catch {
    return false;
  }
}
function markShown(id: string) {
  try {
    sessionStorage.setItem(SEEN_KEY, id);
  } catch {}
}

/**
 * Busca la carta boca abajo del club y la abre como hoja en cuanto llega
 * (al apuntar un partido llega un aviso en tiempo real).
 */
export function CardsProvider({ children }: { children: React.ReactNode }) {
  const viewer = useViewer();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState<CardDraw | null>(null);
  const [open, setOpen] = useState(false);
  const teamId = viewer?.teamId;
  const userId = viewer?.userId;

  const apply = useCallback((card: CardDraw | null) => {
    setPending(card);
    if (card && !wasShown(card.id)) {
      markShown(card.id);
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!teamId || !userId) return;
    const refresh = () => {
      getMyPendingCardAction()
        .then(apply)
        .catch(() => {});
    };
    refresh();
    const channel = supabase
      .channel(`cards:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          if ((payload.new as { kind?: string }).kind === "card_pending") refresh();
        },
      )
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, teamId, userId, apply]);

  const value = useMemo(() => ({ pending, openCard: () => setOpen(true) }), [pending]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {pending && (
        <CardSheet
          key={pending.id}
          card={pending}
          open={open}
          onOpenChange={setOpen}
          onAccepted={() => {
            setOpen(false);
            setPending(null);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

function CardSheet({
  card,
  open,
  onOpenChange,
  onAccepted,
}: {
  card: CardDraw;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: () => void;
}) {
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revealing = useRef(false);
  const deck = DECK_LABEL[card.deck];

  async function flip() {
    if (flipped || revealing.current) return;
    revealing.current = true;
    setFlipped(true);
    try {
      const res = await revealCardAction(card.id);
      setBudget(res.budget);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo girar la carta.");
    } finally {
      revealing.current = false;
    }
  }

  function accept() {
    onAccepted();
    router.refresh();
  }

  const before = budget != null ? budget - card.amount : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // Sin foco automático en «Cerrar»: la carta es lo primero que se ve.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-h-[calc(100dvh-16px)] gap-0 overflow-y-auto border-0 bg-background p-5 pt-2 sm:max-w-md">
        <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <span />
          <DialogTitle className="text-center text-[length:min(1rem,25.5px)] font-semibold">Carta de {deck}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded-full text-[#c7c7cc] active:opacity-50"
          >
            <span className="flex size-[30px] items-center justify-center rounded-full bg-secondary">
              <X className="size-4" aria-hidden strokeWidth={2.4} />
            </span>
          </button>
        </div>
        <DialogDescription className="mt-1 text-center text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
          {card.teamName}
          {card.matchLabel ? ` · ${card.matchLabel}` : ""}
        </DialogDescription>

        <div className="relative mx-auto my-6 h-[432px] w-[300px] max-w-full">
          {!flipped && (
            <>
              <span
                aria-hidden
                className="absolute inset-0 translate-x-[10px] translate-y-[12px] rotate-3 rounded-[18px] opacity-55"
                style={{ background: DECK_COLOR[card.deck], filter: "brightness(0.8)" }}
              />
              <span
                aria-hidden
                className="absolute inset-0 translate-x-[5px] translate-y-[6px] rotate-[1.5deg] rounded-[18px] opacity-80"
                style={{ background: DECK_COLOR[card.deck], filter: "brightness(0.9)" }}
              />
            </>
          )}
          <button
            type="button"
            onClick={flip}
            disabled={flipped}
            aria-label={flipped ? `Carta de ${deck} girada` : `Girar carta de ${deck}`}
            className="relative block size-full rounded-[18px] [perspective:1400px] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#0a84ff]"
          >
            <span
              className={cn(
                "relative block size-full transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none",
                flipped && "[transform:rotateY(180deg)]",
              )}
            >
              <span className="absolute inset-0 [backface-visibility:hidden]">
                <CardBack deck={card.deck} />
              </span>
              <span className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <CardFront card={card} />
              </span>
            </span>
          </button>
        </div>

        {error && <p className="mb-3 text-center text-[length:min(0.8824rem,22.5px)] text-destructive">{error}</p>}

        {flipped ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-card px-4 py-3.5">
              <span className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">Presupuesto</span>
              <span className="flex items-baseline gap-2.5 tabular-nums">
                {before != null && budget != null ? (
                  <span className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
                    {formatMillions(before)} → <span className="font-semibold text-foreground">{formatMillions(budget)}</span>
                  </span>
                ) : (
                  <span className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">Actualizando…</span>
                )}
                <span
                  className={cn(
                    "text-[length:min(0.8824rem,22.5px)] font-semibold",
                    card.amount > 0 ? "text-[#30d158]" : card.amount < 0 ? "text-[#ff6961]" : "text-muted-foreground",
                  )}
                >
                  {signedMillions(card.amount)}
                </span>
              </span>
            </div>
            {card.transfers.length > 0 && (
              <ul className="-mt-1 rounded-[14px] bg-card px-4 py-1">
                {card.transfers.map((t) => (
                  <li key={t.team_id} className="flex items-center justify-between gap-3 border-b border-border/70 py-2.5 last:border-0">
                    <span className="truncate text-[length:min(0.8824rem,22.5px)]">{t.team_name}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[length:min(0.8824rem,22.5px)] font-semibold tabular-nums",
                        t.amount > 0 ? "text-[#ff6961]" : t.amount < 0 ? "text-[#30d158]" : "text-muted-foreground",
                      )}
                    >
                      {signedMillions(-t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={accept}
              className="h-[52px] w-full rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black active:opacity-80"
            >
              Aceptar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={flip}
            className="h-[52px] w-full rounded-full bg-secondary text-[length:min(1rem,25.5px)] font-semibold text-foreground active:opacity-80"
          >
            Girar carta
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
