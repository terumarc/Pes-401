"use server";

import { searchPlayers, type PlayerSearch, type PlayerSearchResult } from "@/lib/data/player-search";

const GROUPS = ["all", "gk", "def", "mid", "att"] as const;
const TIERS = ["all", "S+", "S", "A", "B", "C", "D"] as const;
const ORIGINS = ["all", "free", "club"] as const;
const SORTS = ["rating", "price", "name", "age"] as const;
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback;

/** Búsqueda de jugadores desde el móvil: valida los filtros y devuelve una página de 40. */
export async function searchPlayersAction(params: PlayerSearch): Promise<PlayerSearchResult> {
  return searchPlayers({
    q: typeof params.q === "string" ? params.q.slice(0, 80) : "",
    group: pick(params.group, GROUPS, "all"),
    tier: pick(params.tier, TIERS, "all"),
    origin: pick(params.origin, ORIGINS, "all"),
    sort: pick(params.sort, SORTS, "rating"),
    offset: Number.isFinite(params.offset) ? Math.max(0, Number(params.offset)) : 0,
  });
}
