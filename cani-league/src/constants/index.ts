import type { PlayerPosition, TrophyType } from "@/types";

export const PLAYER_POSITIONS: PlayerPosition[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "DMF",
  "CMF",
  "AMF",
  "LMF",
  "RMF",
  "LWF",
  "RWF",
  "SS",
  "CF",
];

export const NAV_ITEMS = [
  { href: "/league", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/calendar", label: "Partidos", icon: "Swords" },
  { href: "/trophies", label: "Trofeos", icon: "Trophy" },
  { href: "/teams", label: "Equipos", icon: "Shield" },
  { href: "/players", label: "Jugadores", icon: "Users" },
  { href: "/market", label: "Mercado", icon: "Store" },
  { href: "/finances", label: "Finanzas", icon: "Wallet" },
] as const;

export const STAT_LABELS = [
  { key: "speed", label: "Velocidad" },
  { key: "acceleration", label: "Aceleración" },
  { key: "shooting", label: "Tiro" },
  { key: "passing", label: "Pase" },
  { key: "dribbling", label: "Regate" },
  { key: "defending", label: "Defensa" },
  { key: "physical", label: "Físico" },
] as const;

export type StatKey = (typeof STAT_LABELS)[number]["key"];

export const TROPHIES: {
  key: TrophyType;
  label: string;
  short: string;
}[] = [
  { key: "league", label: "Liga", short: "Liga" },
  { key: "champions", label: "Champions League", short: "Champions" },
  { key: "cup", label: "Copa de Liga", short: "Copa de Liga" },
  { key: "conference", label: "Conference League", short: "Conference" },
];
