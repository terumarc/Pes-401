"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TeamLogo } from "@/components/teams/TeamCard";
import { saveNecroporraAction } from "@/app/actions/necroporra";
import type { Team } from "@/types";

/** Ordenar la liga del primero al último con las flechas; el propio club se coloca pero no puntúa. */
export function NecroporraEditor({
  leagueId,
  clubs,
  initial,
  ownTeamId,
  hasSaved,
}: {
  leagueId: string;
  clubs: Team[];
  initial: string[];
  ownTeamId: string | null;
  /** Ya la había guardado antes: sin cambios no hace falta volver a guardar. */
  hasSaved: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [saved, setSaved] = useState<string[] | null>(hasSaved ? initial : null);
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const dirty = saved == null || order.join() !== saved.join();

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }

  async function save() {
    setSaving(true);
    try {
      await saveNecroporraAction(leagueId, order);
      setSaved(order);
      toast.success("Porra guardada", { description: "Puedes cambiarla hasta el primer partido." });
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la porra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ol aria-label="Tu porra, del primero al último" className="overflow-hidden rounded-[22px] bg-card">
        {order.map((id, i) => {
          const t = byId.get(id);
          if (!t) return null;
          const own = id === ownTeamId;
          return (
            <li key={id} className="flex min-h-[60px] items-center gap-2 border-b border-border pl-3 pr-1.5 last:border-b-0">
              <span className="w-6 shrink-0 text-center text-[length:min(0.8824rem,22.5px)] font-bold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <TeamLogo name={t.name} logoUrl={t.logo_url} color={t.primary_color} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[length:min(0.8824rem,22.5px)] font-semibold leading-tight">{t.name}</span>
                {own && (
                  <span className="block text-[length:min(0.7059rem,18px)] text-muted-foreground">Tu club · no puntúa</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Subir ${t.name} al puesto ${i}`}
                className="flex size-11 items-center justify-center rounded-full text-[#0a84ff] active:bg-white/10 disabled:text-muted-foreground/40"
              >
                <ChevronUp className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                aria-label={`Bajar ${t.name} al puesto ${i + 2}`}
                className="flex size-11 items-center justify-center rounded-full text-[#0a84ff] active:bg-white/10 disabled:text-muted-foreground/40"
              >
                <ChevronDown className="size-5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      <Button
        onClick={save}
        disabled={saving || pending || !dirty}
        className="mt-3 h-11 w-full rounded-full text-[length:min(0.8824rem,22.5px)] font-semibold"
      >
        {saving ? "Guardando…" : !dirty ? "Porra guardada" : saved ? "Guardar cambios" : "Guardar porra"}
      </Button>
    </div>
  );
}

