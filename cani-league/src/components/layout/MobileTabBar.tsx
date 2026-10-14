"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronRight,
  Ellipsis,
  House,
  ListOrdered,
  Shield,
  Store,
  Swords,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Pestañas fijas de la barra inferior en móvil. */
export const TABS = [
  { href: "/league", label: "Inicio", Icon: House },
  { href: "/calendar", label: "Partidos", Icon: Swords },
  { href: "/teams", label: "Equipos", Icon: Shield },
  { href: "/market", label: "Mercado", Icon: Store },
] as const;

/** Pantallas que viven dentro de «Más». */
export const MORE = [
  { href: "/players", label: "Jugadores", Icon: Users },
  { href: "/standings", label: "Clasificación", Icon: ListOrdered },
  { href: "/trophies", label: "Sala de trofeos", Icon: Trophy },
  { href: "/finances", label: "Finanzas", Icon: Wallet },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Pantallas raíz: las de las pestañas y las de «Más» (no muestran «Atrás»). */
export function isRootScreen(pathname: string) {
  return [...TABS, ...MORE].some((t) => t.href === pathname) || pathname === "/";
}

export function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((m) => isActive(pathname, m.href));

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors select-none active:opacity-60",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors select-none active:opacity-60",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Ellipsis className="size-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} aria-hidden />
              Más
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-3xl border-border/80 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 md:hidden"
        >
          <div aria-hidden className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="px-1 pb-2 pt-1 text-left">
            <SheetTitle className="text-lg font-semibold">Más</SheetTitle>
            <SheetDescription className="sr-only">Otras secciones de la liga</SheetDescription>
          </SheetHeader>
          <ul className="overflow-hidden rounded-2xl bg-card">
            {MORE.map(({ href, label, Icon }, i) => {
              const active = isActive(pathname, href);
              return (
                <li key={href} className={cn(i > 0 && "border-t border-border/60")}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 px-4 text-[15px] transition-colors active:bg-muted"
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="flex-1 font-medium">{label}</span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
