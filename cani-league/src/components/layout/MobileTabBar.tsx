"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronRight,
  Ellipsis,
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
  { href: "/calendar", label: "Partidos", Icon: Swords },
  { href: "/standings", label: "Tabla", Icon: ListOrdered },
  { href: "/teams", label: "Equipos", Icon: Shield },
  { href: "/market", label: "Mercado", Icon: Store },
] as const;

/** Pantallas que viven dentro de «Más». */
export const MORE = [
  { href: "/players", label: "Jugadores", Icon: Users },
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
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
      >
        <ul className="pointer-events-auto mx-auto flex h-16 max-w-md items-center gap-1 rounded-[1.75rem] border border-white/[0.08] bg-[oklch(0.2_0_0/0.82)] px-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl backdrop-saturate-150">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold transition-[color,background-color,transform] duration-200 select-none active:scale-90",
                    active ? "bg-primary/[0.14] text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} aria-hidden />
                  {label}
                  {active && <span aria-hidden className="absolute -top-2 h-1 w-6 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "relative flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold transition-[color,background-color,transform] duration-200 select-none active:scale-90",
                moreActive ? "bg-primary/[0.14] text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Ellipsis className="size-[22px]" strokeWidth={moreActive ? 2.3 : 1.8} aria-hidden />
              Más
              {moreActive && <span aria-hidden className="absolute -top-2 h-1 w-6 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />}
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
