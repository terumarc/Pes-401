"use client";

import { Plus } from "lucide-react";

export const NEW_LEAGUE_MATCH_EVENT = "league:new-match";

/** «Nuevo partido» de la cabecera de Partidos: abre el selector de clubes del marcador. */
export function NewLeagueMatchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(NEW_LEAGUE_MATCH_EVENT))}
      className="flex h-11 items-center gap-1.5 rounded-full bg-card pl-3 pr-4 text-[length:min(0.8824rem,22.5px)] font-semibold text-foreground transition-opacity active:opacity-70"
    >
      <Plus className="size-[18px]" strokeWidth={2.4} aria-hidden /> Nuevo partido
    </button>
  );
}
