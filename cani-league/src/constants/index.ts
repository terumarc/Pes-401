import type { PlayerPosition } from "@/types";

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
  { href: "/calendar", label: "Liga", icon: "CalendarDays" },
  { href: "/standings", label: "Clasificación", icon: "Trophy" },
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
