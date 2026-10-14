"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderAssistantButton } from "@/components/assistant/header-assistant-button";

const ROUTE_LABELS: Record<string, { title: string; parent?: string }> = {
  "/league": { title: "Dashboard" },
  "/calendar": { title: "Calendario", parent: "Competición" },
  "/standings": { title: "Clasificación", parent: "Competición" },
  "/trophies": { title: "Sala de trofeos", parent: "Competición" },
  "/teams": { title: "Equipos", parent: "Clubes" },
  "/players": { title: "Jugadores", parent: "Base de datos" },
  "/market": { title: "Mercado de Fichajes", parent: "Transferencias" },
  "/finances": { title: "Finanzas", parent: "Economía" },
};

/** Pantallas de detalle: a qué listado pertenecen. */
const DETAIL_ROUTES: { prefix: string; title: string; parent: string; parentHref: string }[] = [
  { prefix: "/teams/", title: "Ficha del club", parent: "Equipos", parentHref: "/teams" },
  { prefix: "/players/", title: "Ficha del jugador", parent: "Jugadores", parentHref: "/players" },
];

const HOME = "/league";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const detail = DETAIL_ROUTES.find((d) => pathname.startsWith(d.prefix));
  const currentRoute = ROUTE_LABELS[pathname] ??
    (detail ? { title: detail.title, parent: detail.parent } : {
      title: pathname.replace("/", "").replace(/-/g, " ") || "Dashboard",
    });
  const canGoBack = pathname !== HOME && pathname !== "/";

  // Pantallas visitadas dentro de la app en esta sesión (la cabecera no se
  // desmonta al navegar, así que el contador sobrevive entre pantallas).
  const visited = useRef(0);
  useEffect(() => {
    visited.current += 1;
  }, [pathname]);

  function goBack() {
    // Si se llegó desde otra pantalla de la app, volver a ella; si se abrió
    // el enlace directamente, ir al listado padre o al inicio.
    if (visited.current > 1) {
      router.back();
    } else {
      router.push(detail?.parentHref ?? HOME);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
          <Separator orientation="vertical" className="mx-1 h-4 bg-border" />
          {canGoBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              aria-label="Volver a la pantalla anterior"
              className="-ml-1 gap-1 px-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft />
              <span className="hidden sm:inline">Atrás</span>
            </Button>
          )}
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

        <div className="flex items-center gap-2.5">
          <HeaderAssistantButton />
          <Badge
            variant="outline"
            className="border-border bg-white/[0.03] text-[11px] font-medium tracking-wide text-muted-foreground hover:bg-white/[0.06] transition-colors hidden sm:inline-flex"
          >
            Temporada 2026
          </Badge>
        </div>
      </div>
    </header>
  );
}
