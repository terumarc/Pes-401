"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPlayerMarketClient } from "@/lib/data/mutations";

type MarketToggleProps = {
  playerId: string;
  available: boolean;
  className?: string;
};

export function MarketToggle({ playerId, available, className }: MarketToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function toggle() {
    await setPlayerMarketClient(playerId, !available);
    startTransition(() => router.refresh());
  }

  return (
    <Button
      type="button"
      variant={available ? "outline" : "default"}
      disabled={pending}
      onClick={toggle}
      className={className || "min-h-[38px] px-3.5 text-xs sm:text-sm font-medium gap-1.5 border-white/[0.1] hover:border-white/[0.2] transition-colors"}
      aria-label={available ? "Retirar jugador del mercado de transferencias" : "Poner jugador en el mercado de transferencias"}
    >
      {pending ? "Guardando..." : available ? "Retirar del mercado" : "Poner en mercado"}
    </Button>
  );
}
