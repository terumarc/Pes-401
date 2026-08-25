"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPlayerMarketClient } from "@/lib/data/mutations";

type MarketToggleProps = {
  playerId: string;
  available: boolean;
};

export function MarketToggle({ playerId, available }: MarketToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function toggle() {
    await setPlayerMarketClient(playerId, !available);
    startTransition(() => router.refresh());
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={available ? "outline" : "default"}
      disabled={pending}
      onClick={toggle}
    >
      {pending ? "…" : available ? "Retirar del mercado" : "Poner en mercado"}
    </Button>
  );
}
