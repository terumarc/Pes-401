import { getPlayers } from "@/lib/data/league";
import { getPlayerEffectiveRating, getPlayerFixedPrice, getPlayerTier, getPositionGroup } from "@/lib/players";
import type { Player, Team } from "@/types";

export const PLAYER_PAGE = 40;

export type PlayerSearch = {
  q?: string;
  group?: "all" | "gk" | "def" | "mid" | "att";
  tier?: "all" | "S+" | "S" | "A" | "B" | "C" | "D";
  origin?: "all" | "free" | "club";
  sort?: "rating" | "price" | "name" | "age";
  offset?: number;
};

/** Lo justo para pintar una fila y abrir la hoja de fichar. */
export type PlayerListItem = Pick<
  Player,
  "id" | "name" | "position" | "age" | "nationality" | "photo_url" | "team_id" | "overall" | "defending" | "transfer_price" | "clause_fee"
> & { team: Pick<Team, "id" | "name" | "short_name" | "primary_color" | "secondary_color" | "logo_url"> | null };

export type PlayerSearchResult = { rows: PlayerListItem[]; total: number };

const isFree = (p: Player & { team?: Partial<Team> | null }) => {
  const n = p.team?.name?.toLowerCase() ?? "";
  return !p.team_id || !p.team || n.includes("libre") || n.includes("sin equipo");
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Busca, filtra, ordena y pagina en el servidor. La lista completa (unos 4.800 jugadores)
 * vive en la caché del servidor; al móvil solo le llegan 40 cada vez.
 */
export async function searchPlayers(params: PlayerSearch): Promise<PlayerSearchResult> {
  const { q = "", group = "all", tier = "all", origin = "all", sort = "rating", offset = 0 } = params;
  const all = await getPlayers();
  const needle = norm(q.trim());

  const list = all.filter((p) => {
    if (group !== "all" && getPositionGroup(p.position) !== group) return false;
    if (tier !== "all" && getPlayerTier(p).tier !== tier) return false;
    if (origin === "free" && !isFree(p)) return false;
    if (origin === "club" && isFree(p)) return false;
    if (!needle) return true;
    return (
      norm(p.name).includes(needle) ||
      norm(p.team?.name ?? "").includes(needle) ||
      norm(p.team?.short_name ?? "").includes(needle) ||
      norm(p.nationality ?? "").includes(needle) ||
      norm(p.position) === needle
    );
  });

  list.sort((a, b) => {
    if (sort === "price") return getPlayerFixedPrice(b) - getPlayerFixedPrice(a);
    if (sort === "name") return a.name.localeCompare(b.name, "es");
    if (sort === "age") return (a.age ?? 99) - (b.age ?? 99);
    return getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a);
  });

  const start = Math.max(0, Math.trunc(offset));
  const rows = list.slice(start, start + PLAYER_PAGE).map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    age: p.age,
    nationality: p.nationality,
    photo_url: p.photo_url,
    team_id: p.team_id,
    overall: p.overall,
    defending: p.defending,
    transfer_price: p.transfer_price,
    clause_fee: p.clause_fee,
    team: p.team
      ? {
          id: p.team.id,
          name: p.team.name,
          short_name: p.team.short_name,
          primary_color: p.team.primary_color,
          secondary_color: p.team.secondary_color,
          logo_url: p.team.logo_url,
        }
      : null,
  }));
  return { rows, total: list.length };
}
