"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cabecera de tabla que ordena al pulsarla. Usa las mismas opciones de orden
 * que el desplegable de la lista: `desc`/`asc` son los valores de esa opción
 * para esta columna (puede haber solo uno).
 */
export function SortableTh<T extends string>({
  children,
  sortBy,
  onSort,
  desc,
  asc,
  className,
}: {
  children: React.ReactNode;
  sortBy: T;
  onSort: (value: T) => void;
  desc?: T;
  asc?: T;
  className?: string;
}) {
  const isDesc = desc !== undefined && sortBy === desc;
  const isAsc = asc !== undefined && sortBy === asc;
  const active = isDesc || isAsc;

  function next() {
    if (isDesc && asc) return onSort(asc);
    if (isAsc && desc) return onSort(desc);
    onSort((desc ?? asc) as T);
  }

  const Icon = isDesc ? ArrowDown : isAsc ? ArrowUp : ArrowUpDown;
  const right = className?.includes("text-right");
  const center = className?.includes("text-center");

  return (
    <th
      scope="col"
      aria-sort={isDesc ? "descending" : isAsc ? "ascending" : "none"}
      className={className}
    >
      <button
        type="button"
        onClick={next}
        className={cn(
          "group/sort inline-flex w-full items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground",
          right && "justify-end",
          center && "justify-center",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon
          aria-hidden
          className={cn(
            "size-3 shrink-0",
            active ? "text-primary" : "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60",
          )}
        />
      </button>
    </th>
  );
}
