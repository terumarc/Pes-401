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
import { GripVertical, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TeamLogo } from "@/components/teams/TeamCard";
import { BudgetDisplay } from "@/components/finances/BudgetDisplay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Arrastra equipos con el manejador para reorganizar la tabla.
        </p>
        {pending && (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[11px] animate-pulse">
            Guardando cambios…
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.team_id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2.5">
            {items.map((item, idx) => (
              <SortableTeam key={item.team_id} item={item} rankIndex={idx} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function SortableTeam({ item, rankIndex }: { item: StandingWithTeam; rankIndex: number }) {
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
          "relative overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 py-0 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.18] hover:bg-card/90",
          isDragging && "z-20 ring-2 ring-primary/80 shadow-2xl opacity-95 scale-[1.01]"
        )}
      >
        <StandingsItem
          item={item}
          delta={delta}
          rankIndex={rankIndex}
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
  rankIndex,
  dragHandleProps,
}: {
  item: StandingWithTeam;
  delta: Delta;
  rankIndex?: number;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const isLeader = item.position === 1;
  const isEurope = item.position > 1 && item.position <= 3;

  return (
    <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      {dragHandleProps && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Mover ${item.team.name}`}
          className="shrink-0 size-8 text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] cursor-grab active:cursor-grabbing rounded-md"
          {...dragHandleProps}
        >
          <GripVertical className="size-4" />
        </Button>
      )}

      {/* Position Badge */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-semibold tabular-nums sm:size-9 sm:text-base",
          isLeader && "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30 font-bold shadow-[0_0_12px_rgba(245,158,11,0.15)]",
          isEurope && "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20",
          !isLeader && !isEurope && "bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.06]"
        )}
      >
        {padPosition(item.position)}
      </div>

      <TeamLogo
        name={item.team.name}
        logoUrl={item.team.logo_url}
        color={item.team.primary_color}
        size="sm"
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
          {item.team.name}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {item.team.owner_name?.trim() || "Sin propietario"}
        </p>
      </div>

      <div className="hidden text-right sm:block">
        <BudgetDisplay amount={item.team.budget} size="sm" />
        <div
          className={cn(
            "mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium",
            delta.direction === "up" && "text-emerald-400",
            delta.direction === "down" && "text-rose-400",
            delta.direction === "same" && "text-muted-foreground/70"
          )}
        >
          {delta.direction === "up" && <TrendingUp className="size-3" />}
          {delta.direction === "down" && <TrendingDown className="size-3" />}
          {delta.direction === "same" && <Minus className="size-3" />}
          <span>{delta.label}</span>
        </div>
      </div>

      <div
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-medium sm:hidden",
          delta.direction === "up" && "text-emerald-400",
          delta.direction === "down" && "text-rose-400",
          delta.direction === "same" && "text-muted-foreground/70"
        )}
      >
        {delta.direction === "up" && <TrendingUp className="size-3" />}
        {delta.direction === "down" && <TrendingDown className="size-3" />}
        <span>{delta.label}</span>
      </div>
    </div>
  );
}
