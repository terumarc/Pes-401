"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Share } from "lucide-react";
import { useConfirm } from "@/components/ui/use-confirm";
import { newInviteCodeAction } from "@/app/actions/profile";

/**
 * Enlace de invitación para compartir en el grupo: quien entra con él pasa a
 * la liga eligiendo su club. Nadie tiene que añadir a nadie a mano.
 */
export function InviteLinkCard({ origin, code }: { origin: string; code: string | null }) {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = code ? `${origin}/unirse/${code}` : null;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se ha podido copiar. Mantén pulsado el enlace para copiarlo.");
    }
  }

  async function share() {
    if (!url) return;
    // Sin hoja de compartir (ordenador): se copia.
    if (typeof navigator.share !== "function") return copy();
    try {
      await navigator.share({ title: "Cani League", text: "Entra en la Cani League con este enlace:", url });
    } catch {
      // Cancelado por el usuario: no pasa nada.
    }
  }

  async function regenerate() {
    if (code) {
      const ok = await confirm({
        title: "Crear un enlace nuevo",
        description: "El enlace actual dejará de funcionar. Quien ya ha entrado sigue dentro.",
        confirmLabel: "Crear enlace nuevo",
        destructive: true,
      });
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      const res = await newInviteCodeAction();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  const pill =
    "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[length:min(0.8824rem,22.5px)] font-semibold outline-none transition-opacity active:opacity-70 disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/60";

  return (
    <section aria-labelledby="invite-title" className="rounded-[22px] bg-card p-5">
      {confirmDialog}
      <h2 id="invite-title" className="text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
        Enlace de invitación
      </h2>
      <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground [text-wrap:pretty]">
        Compártelo en el grupo. Quien lo abre elige su club y ya está dentro: sin correos ni códigos. Su móvil se queda
        recordado.
      </p>

      {url ? (
        <>
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
        </>
      ) : (
        <p className="mt-4 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">No hay ningún enlace activo.</p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[length:min(0.8824rem,22.5px)] text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={regenerate}
        disabled={pending}
        className="mt-2 -mb-2 h-11 rounded-[10px] px-1 text-[length:min(0.8824rem,22.5px)] text-[#0a84ff] outline-none active:opacity-50 disabled:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {pending ? "Creando…" : url ? "Crear un enlace nuevo" : "Crear enlace"}
      </button>
    </section>
  );
}
