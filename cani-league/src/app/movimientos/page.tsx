export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityList } from "@/components/activity/ActivityList";
import { amountFor, getActivity, isActivityGroup, type ActivityGroup } from "@/lib/data/activity";
import { getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { getViewer } from "@/lib/auth";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

const TYPES: { key: ActivityGroup | null; label: string }[] = [
  { key: null, label: "Todo" },
  { key: "fichajes", label: "Fichajes" },
  { key: "ofertas", label: "Ofertas" },
  { key: "partidos", label: "Partidos" },
  { key: "dinero", label: "Dinero" },
];

function href(club: string, tipo: ActivityGroup | null) {
  const q = new URLSearchParams();
  q.set("club", club);
  if (tipo) q.set("tipo", tipo);
  return `/movimientos?${q}`;
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; tipo?: string }>;
}) {
  const [{ club: clubParam, tipo }, viewer, league] = await Promise.all([searchParams, getViewer(), getPrimaryLeague()]);
  if (!viewer) redirect("/login?next=/movimientos");

  const teams = league ? await getTeamsByLeague(league.id) : [];
  const group = isActivityGroup(tipo) ? tipo : undefined;

  // Por defecto, los movimientos de tu club; si no tienes, los de toda la liga.
  const club = clubParam ?? (viewer.teamId ? viewer.teamId : "todos");
  const teamId = club === "todos" ? null : club;
  const team = teamId ? teams.find((t) => t.id === teamId) : null;
  const isMine = !!teamId && teamId === viewer.teamId;

  const rows = await getActivity({ teamId, group });
  const clubMap = Object.fromEntries(
    teams.map((t) => [t.id, { name: t.name, logoUrl: t.logo_url, color: t.primary_color }]),
  );

  // Balance del club con lo que se ve en la lista.
  let incoming = 0;
  let outgoing = 0;
  if (teamId) {
    for (const r of rows) {
      const m = amountFor(r, teamId);
      if (m == null) continue;
      if (m > 0) incoming += m;
      else outgoing += -m;
    }
  }

  const scopes = [
    ...(viewer.teamId ? [{ key: viewer.teamId, label: "Mi club" }] : []),
    ...(teamId && !isMine ? [{ key: teamId, label: team?.name ?? "Club" }] : []),
    { key: "todos", label: "Toda la liga" },
  ];

  return (
    <div className="animate-fade-up mx-auto max-w-2xl pb-12">
      <PageHeader title="Movimientos" />

      <nav aria-label="De quién" className="mb-3">
        <ul className="flex h-9 w-full max-w-sm rounded-[9px] bg-input p-[2px]">
          {scopes.map((s) => {
            const active = s.key === club;
            return (
              <li key={s.key} className={cn("min-w-0 flex-1", active ? "text-white" : "text-[#ebebf5]/60")}>
                <Link
                  href={href(s.key, group ?? null)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full items-center justify-center truncate rounded-[7px] px-2 text-[length:min(0.7647rem,19.5px)] font-semibold transition-colors",
                    active && "bg-[#636366] shadow-[0_3px_8px_rgba(0,0,0,0.12)]",
                  )}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label="Tipo de movimiento" className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {TYPES.map((t) => {
            const active = (group ?? null) === t.key;
            return (
              <li key={t.label}>
                <Link
                  href={href(club, t.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center rounded-full px-3.5 text-[length:min(0.8824rem,22.5px)] transition-colors",
                    active ? "bg-white font-semibold text-black" : "bg-card text-foreground active:bg-white/10",
                  )}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {teamId && (incoming > 0 || outgoing > 0) && (
        <dl className="mb-6 grid grid-cols-2 rounded-[22px] bg-card py-3 text-center">
          <div>
            <dt className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Ha entrado</dt>
            <dd className="text-[length:min(1.1765rem,30px)] font-bold tabular-nums text-[#30d158]">+{formatMoney(incoming)}</dd>
          </div>
          <div className="border-l border-border">
            <dt className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Ha salido</dt>
            <dd className="text-[length:min(1.1765rem,30px)] font-bold tabular-nums text-[#ff453a]">−{formatMoney(outgoing)}</dd>
          </div>
        </dl>
      )}

      <ActivityList
        rows={rows}
        clubs={clubMap}
        teamId={teamId}
        emptyText={
          teamId
            ? `Cuando ${isMine ? "tu club" : team?.name ?? "este club"} fiche, venda, juegue o cobre, aparecerá aquí.`
            : undefined
        }
      />

      {rows.length >= 100 && (
        <p className="mt-4 px-4 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Se muestran los 100 movimientos más recientes.</p>
      )}
    </div>
  );
}
