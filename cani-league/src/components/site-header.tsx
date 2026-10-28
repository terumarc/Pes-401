"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronRight, ChevronLeft, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandMenuButton } from "@/components/layout/CommandMenu";
import { isRootScreen } from "@/components/layout/MobileTabBar";
import { cn } from "@/lib/utils";

const ROUTE_LABELS: Record<string, { title: string; parent?: string }> = {
  "/calendar": { title: "Partidos", parent: "Competición" },
  "/standings": { title: "Clasificación", parent: "Competición" },
  "/trophies": { title: "Sala de trofeos", parent: "Competición" },
  "/cups": { title: "Copas", parent: "Competición" },
  "/scorers": { title: "Goleadores", parent: "Competición" },
  "/seasons": { title: "Historial", parent: "Competición" },
  "/teams": { title: "Equipos", parent: "Clubes" },
  "/players": { title: "Jugadores", parent: "Base de datos" },
  "/market": { title: "Mercado", parent: "Transferencias" },
  "/finances": { title: "Finanzas", parent: "Economía" },
};

/** Pantallas de detalle: a qué listado pertenecen. */
const DETAIL_ROUTES: { prefix: string; title: string; parent: string; parentHref: string }[] = [
  { prefix: "/teams/", title: "Club", parent: "Equipos", parentHref: "/teams" },
  { prefix: "/players/", title: "Jugador", parent: "Jugadores", parentHref: "/players" },
];

const HOME = "/calendar";

export function SiteHeader({ season }: { season?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const detail = DETAIL_ROUTES.find((d) => pathname.startsWith(d.prefix));
  const currentRoute = ROUTE_LABELS[pathname] ??
    (detail ? { title: detail.title, parent: detail.parent } : {
      title: pathname.replace("/", "").replace(/-/g, " ") || "Partidos",
    });
  const canGoBack = !isRootScreen(pathname);
  const root = isRootScreen(pathname);

  // Pantallas visitadas dentro de la app en esta sesión (la cabecera no se
  // desmonta al navegar, así que el contador sobrevive entre pantallas).
  const visited = useRef(0);
  useEffect(() => {
    visited.current += 1;
  }, [pathname]);

  // En móvil, el título pequeño aparece cuando el título grande sale de pantalla.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    <header className="sticky top-0 z-30 shrink-0 bg-background/85 backdrop-blur-xl backdrop-saturate-150 md:border-b md:border-border/80">
      {/* ---------- Móvil: barra de navegación nativa ---------- */}
      <div
        className={cn(
          "grid h-11 grid-cols-[1fr_auto_1fr] items-center px-2 pt-[env(safe-area-inset-top)] box-content transition-[border-color] md:hidden",
          "border-b",
          scrolled || !root ? "border-border/80" : "border-transparent",
        )}
      >
        <div className="flex justify-start">
          {root && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-command-menu"))}
              aria-label="Buscar un club o un jugador"
              className="flex size-11 items-center justify-center text-primary select-none active:opacity-50"
            >
              <Search className="size-5" aria-hidden />
            </button>
          )}
          {!root && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Volver a la pantalla anterior"
              className="flex h-11 items-center gap-0.5 pr-2 text-[length:min(0.8824rem,22.5px)] text-primary select-none active:opacity-50"
            >
              <ChevronLeft className="size-6" strokeWidth={2.2} aria-hidden />
              <span className="max-w-[7rem] truncate">{detail?.parent ?? "Atrás"}</span>
            </button>
          )}
        </div>
        <p
          className={cn(
            "max-w-[50vw] truncate text-center text-[length:min(0.8824rem,22.5px)] font-semibold transition-opacity duration-200",
            root && !scrolled ? "opacity-0" : "opacity-100",
          )}
        >
          {currentRoute.title}
        </p>
        <div aria-hidden />
      </div>

      {/* ---------- Escritorio ---------- */}
      <div className="hidden h-(--header-height) w-full items-center justify-between px-4 md:flex lg:px-6">
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
              <span>Atrás</span>
            </Button>
          )}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-foreground/70 flex items-center gap-1.5">
              <Trophy className="size-3.5 text-primary" />
              Cani League
            </span>
            {currentRoute.parent && (
              <>
                <ChevronRight className="size-3 text-muted-foreground/60" />
                <span className="text-muted-foreground">{currentRoute.parent}</span>
              </>
            )}
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="font-medium text-foreground">{currentRoute.title}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <CommandMenuButton />
          {season && (
            <Badge
              variant="outline"
              className="border-border bg-white/[0.03] text-[length:min(0.7059rem,18px)] font-medium text-muted-foreground"
            >
              Temporada {season}
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
