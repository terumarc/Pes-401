"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { acceptOfferAction, cancelOfferAction, rejectOfferAction } from "@/app/actions/offers";
import { useConfirm } from "@/components/ui/use-confirm";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

export type OfferView = {
  id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  playerId: string;
  playerName: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  swapName: string | null;
  date: string;
};

const STATUS: Record<OfferView["status"], { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "text-[#ff9f0a]" },
  accepted: { label: "Aceptada", cls: "text-[#30d158]" },
  rejected: { label: "Rechazada", cls: "text-[#ff453a]" },
  cancelled: { label: "Retirada", cls: "text-muted-foreground" },
};

function what(o: OfferView) {
  const parts = [o.amount > 0 ? formatMoney(o.amount) : null, o.swapName].filter(Boolean);
  return parts.join(" + ");
}

/** Lista de ofertas: las pendientes con Aceptar / Rechazar / Retirar y las últimas resueltas. */
export function OfferList({ offers, marketOpen, hidePlayer = false }: { offers: OfferView[]; marketOpen: boolean; hidePlayer?: boolean }) {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);
  const [, startTransition] = useTransition();

  const pending = offers.filter((o) => o.status === "pending");
  const resolved = offers.filter((o) => o.status !== "pending");

  function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError({ id, msg: e instanceof Error ? e.message : "No se pudo completar." });
      } finally {
        setBusy(null);
      }
    });
  }

  async function accept(o: OfferView) {
    const ok = await confirm({
      title: `¿Aceptar la oferta de ${o.buyerName}?`,
      description: `${o.playerName} se va a ${o.buyerName}${o.amount > 0 ? ` por ${formatMoney(o.amount)}` : ""}${o.swapName ? ` y ${o.swapName} llega a ${o.sellerName}` : ""}.`,
      confirmLabel: "Aceptar",
    });
    if (ok) run(o.id, () => acceptOfferAction(o.id));
  }

  return (
    <div className="space-y-8">
      {confirmDialog}
      <section aria-labelledby="of-pending">
        <h2 id="of-pending" className="mb-2 px-1 text-[20px] font-bold tracking-tight">
          Pendientes
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-[22px] bg-card px-6 py-8 text-center">
            <p className="text-[17px] font-semibold">No hay ofertas pendientes</p>
            <p className="mt-1 text-[15px] text-muted-foreground">Entra en un jugador de otro club y pulsa «Hacer oferta».</p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-[22px] bg-card">
            {pending.map((o) => (
              <li key={o.id} className="border-b border-border px-4 py-3 last:border-b-0">
                <p className="text-[17px] leading-snug">
                  <span className="font-semibold">{o.buyerName}</span> ofrece {what(o)}
                  {!hidePlayer && (
                    <>
                      {" "}por{" "}
                      <Link href={`/players/${o.playerId}`} className="font-semibold">
                        {o.playerName}
                      </Link>
                    </>
                  )}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                  {o.swapName && <ArrowLeftRight className="size-3.5" aria-label="Intercambio" />}
                  Decide {o.sellerName} · {o.date}
                </p>
                {error?.id === o.id && <p className="mt-2 text-[15px] text-destructive">{error.msg}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!marketOpen || busy === o.id}
                    onClick={() => accept(o)}
                    className="h-9 rounded-full bg-[#30d158] px-4 text-[15px] font-semibold text-black disabled:opacity-40"
                  >
                    {busy === o.id ? "…" : "Aceptar"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => run(o.id, () => rejectOfferAction(o.id))}
                    className="h-9 rounded-full bg-secondary px-4 text-[15px] font-semibold text-[#ff453a] disabled:opacity-40"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => run(o.id, () => cancelOfferAction(o.id))}
                    className="h-9 rounded-full px-3 text-[15px] text-[#0a84ff] disabled:opacity-40"
                  >
                    Retirar
                  </button>
                </div>
                {!marketOpen && <p className="mt-2 text-[13px] text-muted-foreground">Se podrá aceptar cuando abra el mercado.</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section aria-labelledby="of-done">
          <h2 id="of-done" className="mb-2 px-1 text-[20px] font-bold tracking-tight">
            Recientes
          </h2>
          <ul className="overflow-hidden rounded-[22px] bg-card">
            {resolved.map((o) => (
              <li key={o.id} className="flex min-h-11 items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{hidePlayer ? o.buyerName : `${o.buyerName} → ${o.playerName}`}</p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {what(o)} · {o.date}
                  </p>
                </div>
                <span className={cn("shrink-0 text-[13px] font-semibold", STATUS[o.status].cls)}>{STATUS[o.status].label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
