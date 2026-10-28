"use client";

import { Plus } from "lucide-react";

export const NEW_CUP_MATCH_EVENT = "cups:new-match";

/** Mismo botón y en el mismo sitio que «Nuevo partido» de la liga; abre el selector del cuadro de copa. */
export function NewCupMatchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(NEW_CUP_MATCH_EVENT))}
      className="flex h-11 items-center gap-1.5 rounded-full bg-card pl-3 pr-4 text-[length:min(0.8824rem,22.5px)] font-semibold text-foreground transition-opacity active:opacity-70"
    >
      <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden /> Nuevo partido
    </button>
  );
}
