"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronRight } from "lucide-react";

const ROUTE_LABELS: Record<string, { title: string; parent?: string }> = {
  "/league": { title: "Dashboard" },
  "/calendar": { title: "Calendario", parent: "Competición" },
  "/standings": { title: "Clasificación", parent: "Competición" },
  "/teams": { title: "Equipos", parent: "Clubes" },
  "/players": { title: "Jugadores", parent: "Base de datos" },
  "/market": { title: "Mercado de Fichajes", parent: "Transferencias" },
  "/finances": { title: "Finanzas", parent: "Economía" },
};

export function SiteHeader() {
  const pathname = usePathname();
  const currentRoute = ROUTE_LABELS[pathname] || {
    title: pathname.replace("/", "").replace(/-/g, " ") || "Dashboard",
  };

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-white/[0.08] bg-background/80 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
          <Separator
            orientation="vertical"
            className="mx-1 h-4 bg-white/[0.1]"
          />
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="font-semibold text-foreground/70 flex items-center gap-1.5">
              <Trophy className="size-3.5 text-accent-foreground/80 hidden sm:inline" />
              Cani League
            </span>
            {currentRoute.parent && (
              <>
                <ChevronRight className="size-3 text-muted-foreground/60" />
                <span className="text-muted-foreground hidden md:inline">
                  {currentRoute.parent}
                </span>
              </>
            )}
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="font-medium text-foreground">
              {currentRoute.title}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-white/[0.1] bg-white/[0.03] text-[11px] font-medium tracking-wide text-muted-foreground hover:bg-white/[0.06] transition-colors"
          >
            Temporada 2026
          </Badge>
        </div>
      </div>
    </header>
  );
}
