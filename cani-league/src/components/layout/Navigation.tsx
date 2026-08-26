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
} from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/constants";
import { Button } from "@/components/ui/button";
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
} as const;

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-sidebar px-5 py-8 lg:flex lg:flex-col">
        <Brand />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px]",
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
        <p className="text-xs text-muted-foreground">PES 6 · Cani Patch</p>
      </aside>

      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md lg:hidden">
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
    <Link href="/league" className="block">
      <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
        Cani League
      </p>
      {!compact && (
        <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Manager
        </p>
      )}
    </Link>
  );
}
