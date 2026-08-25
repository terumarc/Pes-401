import type { LeagueTableRow } from "@/types";

type LeagueTableProps = {
    rows: LeagueTableRow[];
};

export function LeagueTable({ rows }: LeagueTableProps) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-line shadow-[var(--shadow-soft)]">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-line bg-bg-elevated/60 text-xs text-ink-muted uppercase tracking-wide">
                        <th className="w-8 py-3 pl-4 text-left">#</th>
                        <th className="py-3 pl-2 text-left">Equipo</th>
                        <th className="px-3 py-3 text-center">PJ</th>
                        <th className="px-3 py-3 text-center">G</th>
                        <th className="px-3 py-3 text-center">E</th>
                        <th className="px-3 py-3 text-center">P</th>
                        <th className="px-3 py-3 text-center">GF</th>
                        <th className="px-3 py-3 text-center">GC</th>
                        <th className="px-3 py-3 text-center">DIF</th>
                        <th className="px-4 py-3 text-center font-bold text-ink">PTS</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr
                            key={row.team.id}
                            className="border-b border-line/60 bg-bg-elevated transition-colors last:border-0 hover:bg-muted/20"
                        >
                            <td className="py-3 pl-4 tabular-nums text-ink-muted">{idx + 1}</td>
                            <td className="py-3 pl-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 shrink-0 rounded-full"
                                        style={{ backgroundColor: row.team.primary_color ?? "#6366f1" }}
                                    />
                                    <span className="font-medium">{row.team.name}</span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-center tabular-nums text-ink-muted">{row.played}</td>
                            <td className="px-3 py-3 text-center tabular-nums text-green-600 dark:text-green-400">{row.won}</td>
                            <td className="px-3 py-3 text-center tabular-nums text-ink-muted">{row.drawn}</td>
                            <td className="px-3 py-3 text-center tabular-nums text-red-500 dark:text-red-400">{row.lost}</td>
                            <td className="px-3 py-3 text-center tabular-nums">{row.goals_for}</td>
                            <td className="px-3 py-3 text-center tabular-nums">{row.goals_against}</td>
                            <td className="px-3 py-3 text-center tabular-nums">
                                <span className={row.goal_diff > 0 ? "text-green-600 dark:text-green-400" : row.goal_diff < 0 ? "text-red-500 dark:text-red-400" : ""}>
                                    {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className="font-display text-base font-bold tabular-nums">{row.points}</span>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={10} className="py-12 text-center text-ink-muted text-sm">
                                Aún no hay partidos jugados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
