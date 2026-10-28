"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield, User, CornerDownLeft } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/constants";
import { createClient } from "@/lib/supabase/client";

type TeamHit = { id: string; name: string; short_name: string; primary_color: string };
type PlayerHit = { id: string; name: string; position: string; overall: number | null; team_id: string };

const MAX_RESULTS = 8;

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Buscador rápido (Ctrl/⌘ + K): pantallas, clubes y jugadores. */
export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<TeamHit[] | null>(null);
  const [players, setPlayers] = useState<PlayerHit[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-menu", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-menu", onOpenEvent);
    };
  }, []);

  // Carga clubes y jugadores la primera vez que se abre.
  useEffect(() => {
    if (!open || teams !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const [t, p] = await Promise.all([
          supabase.from("teams").select("id, name, short_name, primary_color").order("name"),
          supabase.from("players").select("id, name, position, overall, team_id").order("name"),
        ]);
        if (cancelled) return;
        if (t.error || p.error) throw t.error ?? p.error;
        setTeams(
          (t.data ?? []).filter(
            (x) => !x.name.toLowerCase().includes("libre") && !x.name.toLowerCase().includes("sin equipo"),
          ),
        );
        setPlayers(p.data ?? []);
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setTeams([]);
          setPlayers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, teams]);

  const q = normalize(query.trim());
  const teamName = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t.short_name || t.name])), [teams]);

  const screenHits = NAV_ITEMS.filter((n) => !q || normalize(n.label).includes(q));
  const teamHits = (teams ?? [])
    .filter((t) => !q || normalize(t.name).includes(q) || normalize(t.short_name ?? "").includes(q))
    .slice(0, MAX_RESULTS);
  const playerHits = q.length >= 2
    ? (players ?? []).filter((p) => normalize(p.name).includes(q)).slice(0, MAX_RESULTS)
    : [];

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
      title="Buscar en la liga"
      description="Busca una pantalla, un club o un jugador"
      className="sm:top-[18%] sm:max-w-xl sm:translate-y-0"
    >
      <Command shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Busca un club, un jugador o una pantalla…"
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          {teams === null ? "Cargando…" : loadError ? "No se pudieron cargar clubes y jugadores." : "Sin resultados."}
        </CommandEmpty>

        {screenHits.length > 0 && (
          <CommandGroup heading="Pantallas">
            {screenHits.map((n) => (
              <CommandItem key={n.href} value={`pantalla ${n.href}`} onSelect={() => go(n.href)}>
                <CornerDownLeft className="text-muted-foreground" />
                {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {teamHits.length > 0 && (
          <CommandGroup heading="Clubes">
            {teamHits.map((t) => (
              <CommandItem key={t.id} value={`club ${t.id}`} onSelect={() => go(`/teams/${t.id}`)}>
                <Shield style={{ color: t.primary_color }} />
                <span className="flex-1 truncate">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.short_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {playerHits.length > 0 && (
          <CommandGroup heading="Jugadores">
            {playerHits.map((p) => (
              <CommandItem key={p.id} value={`jugador ${p.id}`} onSelect={() => go(`/players/${p.id}`)}>
                <User className="text-muted-foreground" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {p.position}
                  {p.overall ? ` · ${p.overall}` : ""}
                  {teamName.get(p.team_id) ? ` · ${teamName.get(p.team_id)}` : ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}

/** Botón de la cabecera que abre el buscador. */
export function CommandMenuButton() {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    // Detectar plataforma solo en el cliente para mostrar ⌘ o Ctrl.
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    if (mac) queueMicrotask(() => setIsMac(true));
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-command-menu"))}
      className="flex h-7 w-56 items-center gap-2 rounded-lg border border-border bg-white/[0.03] px-2.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="size-3.5" aria-hidden />
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">Buscar club o jugador…</span>
      <kbd className="rounded border border-border bg-background px-1 font-sans text-[12px] font-medium">
        {isMac ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}
