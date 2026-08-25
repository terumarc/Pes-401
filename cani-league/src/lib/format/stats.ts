export function formatStat(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function getStatBarWidth(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.max(0, Math.min(100, value));
}

export function formatPositionDelta(
  position: number,
  previousPosition: number | null,
): { label: string; direction: "up" | "down" | "same" } {
  if (previousPosition === null || previousPosition === position) {
    return { label: "— 0", direction: "same" };
  }
  const delta = previousPosition - position;
  if (delta > 0) {
    return { label: `↑ ${delta}`, direction: "up" };
  }
  return { label: `↓ ${Math.abs(delta)}`, direction: "down" };
}

export function padPosition(position: number): string {
  return String(position).padStart(2, "0");
}
