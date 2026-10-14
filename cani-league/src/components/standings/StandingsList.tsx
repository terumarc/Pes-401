"use client";

import { useSensor, useSensors, PointerSensor, TouchSensor } from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Menu } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TeamLogo } from "@/components/teams/TeamCard";
import { reorderStandingsClient } from "@/lib/data/mutations";
import { formatPositionDelta } from "@/lib/format/stats";
import { cn } from "@/lib/utils";
import type { StandingWithTeam } from "@/types";

type StandingsListProps = {
  leagueId: string;
  initialItems: StandingWithTeam[];
};

export function StandingsList({ leagueId, initialItems }: StandingsListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.team_id === active.id);
    const newIndex = items.findIndex((i) => i.team_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      previous_position: item.position,
      position: index + 1,
    }));

    setItems(next);
    setError(null);

    try {
      await reorderStandingsClient(
        leagueId,
        next.map((i) => i.team_id),
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <div>
      {error && <p className="mb-3 text-[15px] text-destructive">{error}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.team_id)} strategy={verticalListSortingStrategy}>
          {/* Lista agrupada de iOS: un bloque redondeado con separadores interiores. */}
          <ul className="overflow-hidden rounded-[22px] bg-card">
            {items.map((item) => (
              <SortableTeam key={item.team_id} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <p className="mt-2 px-4 text-[13px] text-muted-foreground">
        {pending ? "Guardando…" : "Orden manual. Arrastra desde ≡ para mover un equipo."}
      </p>
    </div>
  );
}

function SortableTeam({ item }: { item: StandingWithTeam }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.team_id,
  });
  const delta = formatPositionDelta(item.position, item.previous_position);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative list-none bg-card",
        isDragging && "z-20 rounded-[14px] bg-secondary shadow-[0_12px_30px_rgba(0,0,0,0.6)]",
      )}
    >
      <div className="flex min-h-[60px] items-center gap-3 pl-4 pr-1">
        <span className="w-6 shrink-0 text-center text-[15px] font-semibold tabular-nums text-muted-foreground">
          {item.position}
        </span>
        <TeamLogo name={item.team.name} logoUrl={item.team.logo_url} color={item.team.primary_color} size="xs" />
        {/* El separador empieza donde empieza el texto, como en las listas de iOS. */}
        <div className="flex min-w-0 flex-1 items-center gap-2 self-stretch border-b border-border py-2.5 group-last:border-b-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] leading-tight">{item.team.name}</p>
            <p className="truncate text-[13px] text-muted-foreground">{item.team.owner_name?.trim() || "Sin propietario"}</p>
          </div>
          <span
            className={cn(
              "w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums",
              delta.direction === "up" && "text-[#30d158]",
              delta.direction === "down" && "text-[#ff453a]",
              delta.direction === "same" && "text-muted-foreground",
            )}
            aria-label={
              delta.direction === "up" ? `Sube ${delta.label}` : delta.direction === "down" ? `Baja ${delta.label}` : "Sin cambios"
            }
          >
            {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : ""}
            {delta.direction === "same" ? "–" : delta.label.replace(/[^0-9]/g, "")}
          </span>
          <button
            type="button"
            aria-label={`Mover ${item.team.name}`}
            className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}
