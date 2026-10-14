"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, RotateCcw } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { ChipScroller, lineTone } from "@/components/fantasy/primitives";
import { getPlayerEffectiveRating, getPositionGroup } from "@/lib/players";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types";

/** Jugadores por línea (sin contar al portero), de defensa a ataque. */
const FORMATIONS = {
  "4-3-3": [4, 3, 3],
  "4-4-2": [4, 4, 2],
  "4-2-3-1": [4, 2, 3, 1],
  "3-5-2": [3, 5, 2],
  "5-3-2": [5, 3, 2],
} as const;
type FormationKey = keyof typeof FORMATIONS;
type Group = "gk" | "def" | "mid" | "att";

/** Qué grupo de posiciones alimenta cada línea según la formación. */
function lineGroups(f: FormationKey): Group[] {
  if (f === "4-2-3-1") return ["def", "mid", "mid", "att"];
  return ["def", "mid", "att"];
}

/** Grupo de cada hueco en orden: portero, defensa… ataque. */
function slotGroups(f: FormationKey): Group[] {
  const groups = lineGroups(f);
  return ["gk", ...FORMATIONS[f].flatMap((n, i) => Array<Group>(n).fill(groups[i]))];
}

type Lineup = { formation: FormationKey; slots: (string | null)[] };

/** Once automático: el mejor de cada línea por media. */
function autoLineup(players: Player[], f: FormationKey): Lineup {
  const pools: Record<string, Player[]> = { gk: [], def: [], mid: [], att: [] };
  for (const p of players) {
    const g = getPositionGroup(p.position);
    if (g !== "all") pools[g].push(p);
  }
  for (const k of Object.keys(pools)) {
    pools[k].sort((a, b) => getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a));
  }
  return { formation: f, slots: slotGroups(f).map((g) => pools[g].shift()?.id ?? null) };
}

/** Al cambiar de formación se conservan los titulares que siguen cabiendo en su línea. */
function reshape(prev: Lineup, players: Player[], f: FormationKey): Lineup {
  const fresh = autoLineup(players, f);
  const groups = slotGroups(f);
  const kept = new Map<Group, string[]>();
  slotGroups(prev.formation).forEach((g, i) => {
    const id = prev.slots[i];
    if (id) kept.set(g, [...(kept.get(g) ?? []), id]);
  });
  const used = new Set<string>();
  const slots = groups.map((g) => {
    const id = kept.get(g)?.shift() ?? null;
    if (id) used.add(id);
    return id;
  });
  // Huecos que quedan libres: los rellena el once automático sin repetir.
  for (let i = 0; i < slots.length; i++) {
    const candidate = fresh.slots[i];
    if (!slots[i] && candidate && !used.has(candidate)) {
      slots[i] = candidate;
      used.add(candidate);
    }
  }
  return { formation: f, slots };
}

function loadLineup(key: string, players: Player[]): Lineup | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Lineup;
    if (!(saved.formation in FORMATIONS)) return null;
    const ids = new Set(players.map((p) => p.id));
    const slots = slotGroups(saved.formation).map((_, i) => {
      const id = saved.slots?.[i];
      return id && ids.has(id) ? id : null;
    });
    return { formation: saved.formation, slots };
  } catch {
    return null;
  }
}

function lastName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 && parts[0].length <= 2 ? parts.slice(1).join(" ") : parts[parts.length - 1];
}

type Kit = Pick<Team, "primary_color" | "secondary_color">;

/** Ficha visual del jugador (sin lógica de arrastre). */
function TokenFace({ player, team, outOfPlace }: { player: Player; team: Kit; outOfPlace?: string }) {
  const rating = getPlayerEffectiveRating(player);
  const tone = lineTone(player.position);
  return (
    <>
      <span className="relative">
        <span className="flex size-12 items-end justify-center overflow-hidden rounded-full bg-[#e9f2e4] shadow-[0_4px_10px_rgba(0,0,0,0.45)] ring-2 ring-white/85">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo_url} alt="" className="size-full object-cover" draggable={false} />
          ) : (
            <PixelAvatar
              seed={player.id}
              shirt={team.primary_color}
              trim={team.secondary_color}
              className="size-full translate-y-[12%] scale-110"
            />
          )}
        </span>
        <span className="absolute -right-1.5 -top-1 rounded-md bg-primary px-1 text-[11px] font-bold tabular-nums text-primary-foreground shadow">
          {rating || "–"}
        </span>
      </span>
      <span className="mt-1 w-full overflow-hidden rounded-md bg-background/95 text-center shadow ring-1 ring-black/30">
        <span className="block truncate px-1 pt-0.5 text-[11px] font-semibold leading-tight">{lastName(player.name)}</span>
        {outOfPlace ? (
          <span className="block bg-zinc-800 text-[9px] font-bold leading-[14px] text-amber-300" title="Fuera de su posición">
            {player.position} → {outOfPlace}
          </span>
        ) : (
          <span className={cn("block text-[9px] font-bold leading-[14px]", tone.chip)}>{player.position}</span>
        )}
      </span>
    </>
  );
}

type DragData = { from: "slot"; index: number } | { from: "bench" };

/** Ficha arrastrable. Un toque abre el jugador; mantener pulsado la mueve. */
function DraggableToken({
  id,
  data,
  player,
  team,
  outOfPlace,
  suppressClick,
}: {
  id: string;
  data: DragData;
  player: Player;
  team: Kit;
  outOfPlace?: string;
  suppressClick: React.RefObject<boolean>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { ...data, playerId: player.id } });
  return (
    <Link
      ref={setNodeRef}
      href={`/players/${player.id}`}
      {...listeners}
      {...attributes}
      onClickCapture={(e) => {
        if (suppressClick.current) e.preventDefault();
      }}
      draggable={false}
      className={cn(
        "flex w-[4.5rem] touch-manipulation select-none flex-col items-center outline-none [-webkit-touch-callout:none]",
        "focus-visible:[&>span:first-child>span:first-child]:ring-primary",
        isDragging && "opacity-30",
      )}
      aria-label={`${player.name}, ${player.position}, media ${getPlayerEffectiveRating(player)}. Mantén pulsado para moverlo`}
    >
      <TokenFace player={player} team={team} outOfPlace={outOfPlace} />
    </Link>
  );
}

const GROUP_LABEL: Record<Group, string> = { gk: "POR", def: "DEF", mid: "MED", att: "DEL" };

function PitchSlot({
  index,
  group,
  player,
  team,
  suppressClick,
}: {
  index: number;
  group: Group;
  player: Player | null;
  team: Kit;
  suppressClick: React.RefObject<boolean>;
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `slot-${index}`, data: { index } });
  const outOfPlace = player && getPositionGroup(player.position) !== group ? GROUP_LABEL[group] : undefined;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex justify-center rounded-2xl p-0.5 transition-[background-color,box-shadow] duration-150",
        active && "bg-white/[0.04]",
        isOver && "bg-primary/20 shadow-[0_0_0_2px_var(--color-primary)]",
      )}
    >
      {player ? (
        <DraggableToken
          id={`slot-${index}`}
          data={{ from: "slot", index }}
          player={player}
          team={team}
          outOfPlace={outOfPlace}
          suppressClick={suppressClick}
        />
      ) : (
        <span className="flex w-[4.5rem] flex-col items-center" aria-label={`Hueco libre de ${GROUP_LABEL[group]}`}>
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-white/35 bg-white/[0.06] text-white/70">
            <Plus className="size-5" aria-hidden />
          </span>
          <span className="mt-1 rounded-md bg-black/30 px-2 text-[10px] font-semibold leading-5 text-white/70">
            {GROUP_LABEL[group]}
          </span>
        </span>
      )}
    </div>
  );
}

function BenchItem({ player, team, suppressClick }: { player: Player; team: Kit; suppressClick: React.RefObject<boolean> }) {
  const { setNodeRef, isOver } = useDroppable({ id: `benchp-${player.id}`, data: { benchPlayer: player.id } });
  return (
    <div
      ref={setNodeRef}
      className={cn("shrink-0 rounded-2xl p-0.5 transition-shadow", isOver && "shadow-[0_0_0_2px_var(--color-primary)]")}
    >
      <DraggableToken id={`bench-${player.id}`} data={{ from: "bench" }} player={player} team={team} suppressClick={suppressClick} />
    </div>
  );
}

function BenchZone({ children, count }: { children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: "bench" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-2xl bg-card p-3 transition-shadow",
        active && "shadow-[0_0_0_1px_var(--color-border)]",
        isOver && "shadow-[0_0_0_2px_var(--color-primary)]",
      )}
    >
      <p className="mb-2 text-sm font-semibold">
        Banquillo <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
      </p>
      {children}
    </div>
  );
}

/** Campo con la formación del equipo. Las fichas se arrastran entre huecos y banquillo. */
export function TeamFormation({
  team,
  players,
  teamId,
}: {
  team: Kit;
  players: Player[];
  /** Si se pasa, la alineación se recuerda en este dispositivo. */
  teamId?: string;
}) {
  const storageKey = `formation:${teamId ?? "demo"}`;
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const [lineup, setLineup] = useState<Lineup>(() => autoLineup(players, "4-3-3"));
  const [activeId, setActiveId] = useState<string | null>(null);
  const suppressClick = useRef(false);
  const hydrated = useRef(false);

  // Recupera la alineación guardada (solo en el cliente).
  useEffect(() => {
    const saved = teamId ? loadLineup(storageKey, players) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras montar
    if (saved) setLineup(saved);
    hydrated.current = true;
  }, [storageKey, teamId, players]);

  useEffect(() => {
    if (!teamId || !hydrated.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lineup));
    } catch {
      /* sin almacenamiento: la alineación vive solo en esta visita */
    }
  }, [lineup, storageKey, teamId]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const groups = slotGroups(lineup.formation);
  const starters = new Set(lineup.slots.filter(Boolean) as string[]);
  const bench = players
    .filter((p) => !starters.has(p.id))
    .sort((a, b) => getPlayerEffectiveRating(b) - getPlayerEffectiveRating(a));
  const filled = starters.size;

  // Filas de ataque (arriba) a portero (abajo).
  const rows: number[][] = [];
  let cursor = 1;
  for (const n of FORMATIONS[lineup.formation]) {
    rows.push(Array.from({ length: n }, (_, k) => cursor + k));
    cursor += n;
  }
  rows.reverse().push([0]);

  const activePlayer = activeId ? byId.get(activeId) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId((e.active.data.current as { playerId: string }).playerId);
    suppressClick.current = true;
    navigator.vibrate?.(10);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    // El clic que sigue a soltar no debe abrir la ficha del jugador.
    setTimeout(() => (suppressClick.current = false), 0);
    const { active, over } = e;
    if (!over) return;
    const src = active.data.current as DragData & { playerId: string };
    const dst = over.data.current as { index?: number; benchPlayer?: string } | undefined;

    setLineup((prev) => {
      const slots = [...prev.slots];
      if (src.from === "slot") {
        if (dst?.index !== undefined) {
          // Campo → campo: intercambio.
          [slots[src.index], slots[dst.index]] = [slots[dst.index], slots[src.index]];
        } else if (dst?.benchPlayer) {
          // Campo → suplente concreto: entra el suplente.
          slots[src.index] = dst.benchPlayer;
        } else if (over.id === "bench") {
          slots[src.index] = null;
        } else return prev;
      } else if (dst?.index !== undefined) {
        // Banquillo → campo: el titular (si lo hay) se va al banquillo.
        slots[dst.index] = src.playerId;
      } else return prev;
      return { ...prev, slots };
    });
  }

  return (
    <section aria-label="Formación" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Formación <span className="font-normal text-muted-foreground tabular-nums">{filled}/11</span>
        </h2>
        <button
          type="button"
          onClick={() => setLineup(autoLineup(players, lineup.formation))}
          className="flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Mejor once
        </button>
      </div>

      <ChipScroller
        ariaLabel="Elegir formación"
        value={lineup.formation}
        onChange={(f) => setLineup((prev) => reshape(prev, players, f))}
        options={(Object.keys(FORMATIONS) as FormationKey[]).map((f) => ({ value: f, label: f }))}
      />

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        {/* Campo */}
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{ background: "repeating-linear-gradient(180deg,#173523 0 12.5%,#14301f 12.5% 25%)" }}
        >
          <svg aria-hidden viewBox="0 0 100 140" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
            <g fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" vectorEffect="non-scaling-stroke">
              <rect x="4" y="3" width="92" height="134" rx="1" />
              <line x1="4" y1="70" x2="96" y2="70" />
              <circle cx="50" cy="70" r="11" />
              <rect x="24" y="3" width="52" height="20" />
              <rect x="37" y="3" width="26" height="7" />
              <rect x="24" y="117" width="52" height="20" />
              <rect x="37" y="130" width="26" height="7" />
            </g>
          </svg>

          <div className="relative flex min-h-[31rem] flex-col justify-around gap-1 px-1 py-4 sm:min-h-[35rem]">
            {rows.map((row, i) => (
              <div key={i} className="flex justify-evenly">
                {row.map((idx) => (
                  <PitchSlot
                    key={idx}
                    index={idx}
                    group={groups[idx]}
                    player={lineup.slots[idx] ? byId.get(lineup.slots[idx]!) ?? null : null}
                    team={team}
                    suppressClick={suppressClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="px-1 text-xs text-muted-foreground">Mantén pulsado un jugador y suéltalo en otro hueco o en el banquillo.</p>

        <BenchZone count={bench.length}>
          {bench.length ? (
            <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
              {bench.map((p) => (
                <BenchItem key={p.id} player={p} team={team} suppressClick={suppressClick} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Arrastra aquí a un titular para sentarlo.</p>
          )}
        </BenchZone>

        <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.2,0,0,1)" }}>
          {activePlayer ? (
            <div className="flex w-[4.5rem] scale-110 flex-col items-center drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)]">
              <TokenFace player={activePlayer} team={team} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
