/**
 * Ventana de fichajes automática. El mercado está abierto:
 * - antes de que empiece la liga (ningún partido jugado de la temporada),
 * - en el parón entre la primera y la segunda vuelta (ida completa y ningún partido de vuelta jugado),
 * - al acabar la temporada (todos los partidos jugados).
 */
export type WindowMatch = { played: boolean | null; round: number | null };

export type MarketWindow = {
  open: boolean;
  /** Por qué está abierto o cerrado, para enseñarlo en la app. */
  reason: string;
};

export function marketWindow(matches: WindowMatch[]): MarketWindow {
  if (matches.length === 0) return { open: true, reason: "Pretemporada: la liga aún no tiene calendario." };
  const played = matches.filter((m) => m.played);
  if (played.length === 0) return { open: true, reason: "Pretemporada: abierto hasta el primer partido." };
  if (played.length === matches.length) return { open: true, reason: "Temporada terminada: abierto hasta la nueva temporada." };

  const first = matches.filter((m) => (m.round ?? 1) === 1);
  const second = matches.filter((m) => (m.round ?? 1) === 2);
  const firstDone = first.length > 0 && first.every((m) => m.played);
  const secondStarted = second.some((m) => m.played);
  if (firstDone && !secondStarted) return { open: true, reason: "Mercado de invierno: abierto hasta el primer partido de la vuelta." };

  if (!firstDone) {
    const left = first.length - first.filter((m) => m.played).length;
    return { open: false, reason: `Abre al acabar la primera vuelta (${left === 1 ? "falta 1 partido" : `faltan ${left} partidos`}).` };
  }
  const left = matches.length - played.length;
  return { open: false, reason: `Abre al acabar la temporada (${left === 1 ? "falta 1 partido" : `faltan ${left} partidos`}).` };
}
