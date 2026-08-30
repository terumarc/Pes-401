"use client";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { PlayerCard } from "@/components/players/PlayerCard";
import type { Player } from "@/types";

export function PlayerList({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.position?.toString().toLowerCase().includes(term) ?? false)
    );
  }, [search, players]);

  return (
    <div className="mt-6 space-y-4">
      <div className="relative max-w-md">
        <Input
          placeholder="Buscar jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
          No se encuentran jugadores que coincidan.
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              href={`/players/${player.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
