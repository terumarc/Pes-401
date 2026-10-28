import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Control segmentado de iOS hecho con enlaces: cambia entre pantallas hermanas
 * de una misma pestaña (Clasificación | Trofeos, Clubes | Finanzas).
 */
export function SegmentedNav({
  items,
  current,
  label,
}: {
  items: { href: string; label: string }[];
  current: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="mb-5">
      <ul className="flex h-9 w-full max-w-sm rounded-[9px] bg-input p-[2px]">
        {items.map((item) => {
          const active = item.href === current;
          return (
            <li key={item.href} className={cn("flex-1", active ? "text-white" : "text-[#ebebf5]/60")}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full items-center justify-center rounded-[7px] px-1 font-semibold transition-colors",
                  items.length > 3 ? "text-[length:min(0.7059rem,18px)] tracking-tight" : "text-[length:min(0.7647rem,19.5px)]",
                  active && "bg-[#636366] shadow-[0_3px_8px_rgba(0,0,0,0.12)]",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const TABLE_SECTIONS = [
  { href: "/standings", label: "Clasificación" },
  { href: "/scorers", label: "Goleadores" },
  { href: "/trophies", label: "Trofeos" },
  { href: "/seasons", label: "Historial" },
];

export const MATCH_SECTIONS = [
  { href: "/calendar", label: "Liga" },
  { href: "/cups", label: "Copas" },
];

export const TEAM_SECTIONS = [
  { href: "/teams", label: "Clubes" },
  { href: "/finances", label: "Finanzas" },
];
