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
import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TeamLogo } from "@/components/teams/TeamCard";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reorderStandingsClient } from "@/lib/data/mutations";
import {
  formatPositionDelta,
  padPosition,
} from "@/lib/format/stats";
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
      <p className="mb-4 text-sm text-ink-muted">
        Arrastra equipos para reordenar. Los cambios se guardan solos.
        {pending ? " Guardando…" : ""}
      </p>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.team_id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-3">
            {items.map((item) => (
              <SortableTeam key={item.team_id} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function SortableTeam({ item }: { item: StandingWithTeam }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.team_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const delta = formatPositionDelta(item.position, item.previous_position);

  return (
    <li ref={setNodeRef} style={style} className="touch-none list-none">
      <Card
        className={cn(
          "py-0",
          isDragging && "z-10 ring-2 ring-primary opacity-95",
        )}
      >
        <StandingsItem
          item={item}
          delta={delta}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </Card>
    </li>
  );
}

type Delta = ReturnType<typeof formatPositionDelta>;

export function StandingsItem({
  item,
  delta,
  dragHandleProps,
}: {
  item: StandingWithTeam;
  delta: Delta;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
      {dragHandleProps && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Mover ${item.team.name}`}
          className="shrink-0 text-muted-foreground"
          {...dragHandleProps}
        >
          <GripVertical className="size-5" />
        </Button>
      )}
      <p className="w-10 shrink-0 font-display text-2xl font-semibold tabular-nums text-muted-foreground sm:w-12 sm:text-3xl">
        {padPosition(item.position)}
      </p>
      <TeamLogo
        name={item.team.name}
        logoUrl={item.team.logo_url}
        color={item.team.primary_color}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
          {item.team.name}
        </h3>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">
          {item.team.owner_name?.trim() || "Sin propietario"}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <BudgetDisplay amount={item.team.budget} size="sm" />
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            delta.direction === "up" && "text-primary",
            delta.direction === "down" && "text-destructive",
            delta.direction === "same" && "text-muted-foreground",
          )}
        >
          {delta.label}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 text-xs font-medium sm:hidden",
          delta.direction === "up" && "text-primary",
          delta.direction === "down" && "text-destructive",
          delta.direction === "same" && "text-muted-foreground",
        )}
      >
        {delta.label}
      </p>
    </div>
  );
}
