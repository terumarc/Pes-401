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
  // Con letra grande, cuatro secciones no caben en un control segmentado: pasan a pastillas deslizables.
  const many = items.length > 3;
  return (
    <nav aria-label={label} className={cn("mb-5", many && "large-text:-mx-4 large-text:overflow-x-auto large-text:px-4 large-text:[scrollbar-width:none]")}>
      <ul
        className={cn(
          "flex h-9 w-full max-w-sm rounded-[9px] bg-input p-[2px]",
          many && "large-text:h-auto large-text:w-max large-text:max-w-none large-text:gap-2 large-text:bg-transparent large-text:p-0",
        )}
      >
        {items.map((item) => {
          const active = item.href === current;
          return (
            <li key={item.href} className={cn("flex-1", many && "large-text:flex-none", active ? "text-white" : "text-[#ebebf5]/60")}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full items-center justify-center rounded-[7px] px-1 font-semibold transition-colors",
                  many ? "text-[length:min(0.7059rem,18px)] tracking-tight" : "text-[length:min(0.7647rem,19.5px)]",
                  active && "bg-[#636366] shadow-[0_3px_8px_rgba(0,0,0,0.12)]",
                  many &&
                    "large-text:h-11 large-text:rounded-full large-text:bg-card large-text:px-4 large-text:text-[length:min(0.8824rem,22.5px)] large-text:tracking-normal large-text:shadow-none",
                  many && active && "large-text:bg-white large-text:text-black",
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
