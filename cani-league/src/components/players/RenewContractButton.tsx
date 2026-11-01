"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renewContractAction } from "@/app/actions/contracts";
import { canActFor, useViewer } from "@/components/auth/ViewerProvider";
import { formatMoney } from "@/lib/format/money";

/** Botón para renovar un contrato acabado (solo su club o un admin). */
export function RenewContractButton({ playerId, teamId, cost }: { playerId: string; teamId: string; cost: number }) {
  const viewer = useViewer();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canActFor(viewer, teamId)) return null;

  async function renew() {
    setBusy(true);
    setError(null);
    try {
      await renewContractAction(playerId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo renovar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={renew}
        disabled={busy}
        className="h-[50px] w-full rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black active:opacity-80 disabled:opacity-40"
      >
        {busy ? "Renovando…" : `Renovar contrato por ${formatMoney(cost)}`}
      </button>
      {error && <p className="mt-2 px-4 text-[length:min(0.7647rem,19.5px)] text-destructive">{error}</p>}
    </div>
  );
}
