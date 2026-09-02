"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Shield,
  Users,
  Store,
  Wallet,
  Menu,
  CalendarDays,
  Swords,
} from "lucide-react";

import { NAV_ITEMS } from "@/constants";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ICONS = {
  LayoutDashboard,
  Trophy,
  Shield,
  Users,
  Store,
  Wallet,
  CalendarDays,
  Swords,
} as const;

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
useEffect(() => {
  setOpen(false);
}, [pathname]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border/80 bg-sidebar px-5 py-8 lg:flex lg:flex-col justify-between">
        <div>
          <Brand />
          <nav className="mt-8 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.icon];
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                  )}
                  <Icon
                    className={cn(
                      "size-[18px] transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-xl border border-sidebar-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between font-medium text-foreground">
            <span>PES 6 Cani Patch</span>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">v2.0</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Liga & Mercado Sync</p>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand compact />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Abrir menú"
                onClick={() => setOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-left">
                  Cani League
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Navegación móvil de la liga
                </SheetDescription>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 px-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent font-semibold text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/league" className="group flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
        CL
      </div>
      <div>
        <p className="font-display text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
          Cani League
        </p>
        {!compact && (
          <p className="font-display text-xl font-bold tracking-tight text-foreground">
            Manager 2026
          </p>
        )}
      </div>
    </Link>
  );
}
