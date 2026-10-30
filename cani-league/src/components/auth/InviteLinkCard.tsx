"use client";

import { useState } from "react";
import { Check, Copy, Share } from "lucide-react";

/** La dirección de la app para pasarla al grupo: quien la abre elige su club y entra. */
export function InviteLinkCard({ origin }: { origin: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = origin;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se ha podido copiar. Mantén pulsado el enlace para copiarlo.");
    }
  }

  async function share() {
    // Sin hoja de compartir (ordenador): se copia.
    if (typeof navigator.share !== "function") return copy();
    try {
      await navigator.share({ title: "Cani League", text: "Entra en la Cani League y elige tu club:", url });
    } catch {
      // Cancelado: no pasa nada.
    }
  }

  const pill =
    "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[length:min(0.8824rem,22.5px)] font-semibold outline-none transition-opacity active:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/60";

  return (
    <section aria-labelledby="invite-title" className="rounded-[22px] bg-card p-5">
      <h2 id="invite-title" className="text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
        Enlace de la app
      </h2>
      <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground [text-wrap:pretty]">
        Pásalo al grupo. Quien lo abre elige su club y ya está dentro: sin correos, códigos ni contraseñas. Su móvil se queda
        recordado.
      </p>
      <p className="mt-4 rounded-[10px] bg-input px-3 py-2.5 font-mono text-[length:min(0.7647rem,19.5px)] break-all select-all">
        {url}
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={copy} className={`${pill} bg-white text-black`}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copiado" : "Copiar enlace"}
        </button>
        <button type="button" onClick={share} className={`${pill} bg-secondary text-foreground`}>
          <Share className="size-4" aria-hidden />
          Compartir
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[length:min(0.8824rem,22.5px)] text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
