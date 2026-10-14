"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListOrdered, Shield, Store, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pestañas de la barra inferior en móvil. Sin pestaña «Más» (las guías de Apple la
 * desaconsejan): Trofeos vive dentro de Tabla y Finanzas dentro de Equipos.
 * `also` son las pantallas que cuentan como esa pestaña.
 */
export const TABS = [
  { href: "/calendar", label: "Partidos", Icon: Swords, also: [] as string[] },
  { href: "/standings", label: "Tabla", Icon: ListOrdered, also: ["/trophies"] },
  { href: "/teams", label: "Equipos", Icon: Shield, also: ["/finances"] },
  { href: "/players", label: "Jugadores", Icon: Users, also: [] as string[] },
  { href: "/market", label: "Mercado", Icon: Store, also: [] as string[] },
] as const;

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, tab: (typeof TABS)[number]) {
  return [tab.href, ...tab.also].some((h) => matches(pathname, h));
}

/** Pantallas raíz (no muestran «Atrás»): las de las pestañas y sus secciones hermanas. */
export function isRootScreen(pathname: string) {
  return pathname === "/" || TABS.some((t) => [t.href, ...t.also].includes(pathname));
}

/** Barra tipo iOS: cápsula de cristal flotante; la pestaña activa en una cápsula más clara. */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="pointer-events-auto mx-auto flex h-[62px] max-w-md items-center rounded-full bg-[rgba(30,30,32,0.72)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_0_0_0.5px_rgba(255,255,255,0.14)] backdrop-blur-xl backdrop-saturate-[1.8]">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab);
          const { href, label, Icon } = tab;
          return (
            // El color va en el <li>: la regla global de los enlaces (color: inherit) lo hereda.
            <li key={href} className={cn("h-full flex-1", active ? "text-white" : "text-[#98989f]")}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-[3px] rounded-full text-[11px] font-medium tracking-[-0.01em] transition-colors duration-200 select-none active:bg-white/10",
                  active && "bg-white/[0.13]",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.9} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
