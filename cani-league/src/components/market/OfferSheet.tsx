"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOfferAction } from "@/app/actions/offers";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { formatMoney } from "@/lib/format/money";

type Club = { id: string; name: string; budget: number };
type SquadPlayer = { id: string; name: string; position: string; team_id: string };

/** Botón «Hacer oferta» y su hoja: club que oferta, dinero y, si se quiere, un jugador a cambio. */
export function OfferSheet({
  player,
  clubs,
  squads,
  suggested,
}: {
  player: { id: string; name: string; team_id: string; teamName: string };
  clubs: Club[];
  squads: SquadPlayer[];
  suggested: number;
}) {
  const router = useRouter();
  const buyers = useMemo(() => clubs.filter((c) => c.id !== player.team_id), [clubs, player.team_id]);
  const [open, setOpen] = useState(false);
  const [buyerId, setBuyerId] = useState("");
  const [amount, setAmount] = useState(suggested);
  const [swapId, setSwapId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const buyer = buyers.find((c) => c.id === buyerId);
  const squad = squads.filter((p) => p.team_id === buyerId).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const short = buyer != null && buyer.budget < amount;

  function send() {
    setError(null);
    startTransition(async () => {
      try {
        await createOfferAction({ playerId: player.id, buyerTeamId: buyerId, amount, swapPlayerId: swapId || null });
        setDone(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo enviar la oferta.");
      }
    });
  }

  function reset(o: boolean) {
    setOpen(o);
    if (!o) {
      setDone(false);
      setError(null);
    }
  }

  const selectCls =
    "h-11 w-full rounded-[10px] bg-input px-3 text-[length:min(1rem,25.5px)] outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-[50px] w-full rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black active:opacity-80"
      >
        Hacer oferta
      </button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
          <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center large-text:grid-cols-1 large-text:justify-items-start large-text:gap-1">
            <button type="button" onClick={() => reset(false)} className="h-11 justify-self-start text-[length:min(1rem,25.5px)] text-[#0a84ff]">
              {done ? "Cerrar" : "Cancelar"}
            </button>
            <DialogTitle className="text-[length:min(1rem,25.5px)] font-semibold">Oferta por {player.name}</DialogTitle>
            <span />
          </div>

          {done ? (
            <DialogDescription className="mt-6 pb-4 text-center text-[length:min(1rem,25.5px)]">
              Oferta enviada a {player.teamName}. Su dueño la verá en Mercado → Ofertas.
            </DialogDescription>
          ) : (
            <>
              <DialogDescription className="mt-3 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
                {player.teamName} decide si la acepta. Solo se puede aceptar con el mercado abierto.
              </DialogDescription>

              <label className="mt-5 block">
                <span className="mb-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Club que oferta</span>
                <select value={buyerId} onChange={(e) => { setBuyerId(e.target.value); setSwapId(""); }} className={selectCls}>
                  <option value="">Elige un club</option>
                  {buyers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {buyer && (
                  <span className={`mt-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] ${short ? "text-[#ff453a]" : "text-muted-foreground"}`}>
                    Presupuesto: {formatMoney(buyer.budget)}
                  </span>
                )}
              </label>

              <div className="mt-4">
                <span className="mb-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Dinero</span>
                <MoneyInput value={amount} onChange={setAmount} ariaLabel="Dinero de la oferta" placeholder="0" />
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Jugador a cambio (opcional)</span>
                <select value={swapId} onChange={(e) => setSwapId(e.target.value)} disabled={!buyerId} className={`${selectCls} disabled:opacity-40`}>
                  <option value="">Ninguno</option>
                  {squad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.position}
                    </option>
                  ))}
                </select>
              </label>

              {error && <p className="mt-3 text-[length:min(0.8824rem,22.5px)] text-destructive">{error}</p>}
              <button
                type="button"
                onClick={send}
                disabled={pending || !buyerId || short || (amount <= 0 && !swapId)}
                className="mt-6 h-[50px] w-full rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black disabled:opacity-40"
              >
                {pending ? "Enviando…" : "Enviar oferta"}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
