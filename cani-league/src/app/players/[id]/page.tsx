export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PixelAvatar } from "@/components/fantasy/PixelAvatar";
import { PlayerActions } from "@/components/players/PlayerActions";
import { PlayerForm } from "@/components/players/PlayerForm";
import { PlayerStats } from "@/components/players/PlayerStats";
import { getPlayerById, getPrimaryLeague, getTeamsByLeague } from "@/lib/data/league";
import { formatMoney } from "@/lib/format/money";
import { getPlayerTier, getPlayerEffectiveRating, getPlayerContractInfo } from "@/lib/players";
import { getPlayerSalary, getSeasonsLeft, DEFAULT_SALARY_PERCENT } from "@/lib/contracts";
import { getSalaryTable } from "@/lib/data/contracts";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

function short(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  return formatMoney(value);
}

export default async function PlayerDetailPage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) return <p className="text-muted-foreground">Configura Supabase primero.</p>;

  const { id } = await params;
  const { edit } = await searchParams;
  const player = await getPlayerById(id);
  if (!player) notFound();

  const league = await getPrimaryLeague();
  const [teams, salaries] = league
    ? await Promise.all([getTeamsByLeague(league.id), getSalaryTable(league.id)])
    : [[], DEFAULT_SALARY_PERCENT];
  const tier = getPlayerTier(player);
  const rating = getPlayerEffectiveRating(player);
  const contract = getPlayerContractInfo(player);
  const team = player.team;
  const freeAgent = !team || /libre|sin equipo/i.test(team.name);

  if (edit === "1") {
    return (
      <div className="animate-fade-up mx-auto max-w-2xl pb-12">
        <h1 className="mb-5 text-[34px] font-bold tracking-tight">Editar jugador</h1>
        <div className="rounded-[22px] bg-card p-5">
          <PlayerForm teams={teams} player={player} />
        </div>
        <Link href={`/players/${player.id}`} className="mt-4 inline-flex h-11 items-center text-[17px] text-[#0a84ff]">
          Cancelar
        </Link>
      </div>
    );
  }

  const facts: [string, React.ReactNode][] = [
    ["Precio", formatMoney(contract.price)],
    [
      "Contrato",
      freeAgent || contract.duration === 0
        ? "Sin contrato"
        : `${getSeasonsLeft(player)} de ${contract.duration} ${contract.duration === 1 ? "temporada" : "temporadas"}`,
    ],
    ["Sueldo", getPlayerSalary(player, salaries) > 0 ? `${formatMoney(getPlayerSalary(player, salaries))} por temporada` : "Sin sueldo"],
    ["Renovación", contract.renewalCost > 0 ? `${contract.renewalPercentLabel} · ${formatMoney(contract.renewalCost)}` : "Gratis"],
    ["En el mercado", player.available_in_market ? "Sí" : "No"],
  ];

  return (
    <div className="animate-fade-up pb-12">
      {/* Cabecera: color del club fundido con el fondo, avatar pixel art y cifras clave. */}
      <header className="relative -mx-4 -mt-2 mb-6 px-4 pb-2 pt-6 md:mx-0 md:mt-0 md:rounded-[22px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 md:rounded-[22px]"
          style={{ background: `linear-gradient(180deg, ${freeAgent ? "#3a3a3c" : team.primary_color}66 0%, transparent 85%)` }}
        />
        <div className="relative flex flex-col items-center text-center">
          <span className="flex size-24 items-end justify-center overflow-hidden rounded-full bg-[#2c2c2e]">
            {player.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photo_url} alt="" className="size-full object-cover" />
            ) : (
              <PixelAvatar
                seed={player.id}
                shirt={freeAgent ? "#5d6675" : team.primary_color}
                trim={freeAgent ? undefined : team.secondary_color}
                className="size-full translate-y-[12%] scale-110"
              />
            )}
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight">{player.name}</h1>
          <p className="text-[15px] text-muted-foreground">
            {[player.position, player.age ? `${player.age} años` : null, player.nationality].filter(Boolean).join(" · ")}
          </p>

          <dl className="mt-5 grid w-full max-w-md grid-cols-3 rounded-[22px] bg-card py-3">
            {[
              { label: "Media", value: rating || "–" },
              { label: "Nivel", value: tier.tier },
              { label: "Precio", value: short(contract.price) },
            ].map((s, i) => (
              <div key={s.label} className={i > 0 ? "border-l border-border" : undefined}>
                <dt className="text-[13px] text-muted-foreground">{s.label}</dt>
                <dd className="text-[20px] font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="pl-club">
            <h2 id="pl-club" className="mb-2 px-1 text-[20px] font-bold tracking-tight">
              Ficha
            </h2>
            <ul className="overflow-hidden rounded-[22px] bg-card">
              <li className="border-b border-border">
                {freeAgent ? (
                  <div className="flex min-h-11 items-center justify-between px-4 py-3 text-[17px]">
                    <span>Club</span>
                    <span className="text-muted-foreground">Agente libre</span>
                  </div>
                ) : (
                  <Link href={`/teams/${team.id}`} className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-[17px] active:bg-white/[0.06]">
                    <span>Club</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {team.name}
                      <ChevronRight className="size-4 text-[#5a5a5f]" aria-hidden />
                    </span>
                  </Link>
                )}
              </li>
              {facts.map(([k, v], i) => (
                <li
                  key={k}
                  className={`flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-[17px] ${i < facts.length - 1 ? "border-b border-border" : ""}`}
                >
                  <span>{k}</span>
                  <span className="text-right tabular-nums text-muted-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Acciones">
            <PlayerActions
              playerId={player.id}
              availableInMarket={player.available_in_market}
              teams={teams}
              currentTeamId={player.team_id}
              player={player}
              variant="default"
            />
          </section>
        </div>

        <section aria-labelledby="pl-stats">
          <h2 id="pl-stats" className="mb-2 px-1 text-[20px] font-bold tracking-tight">
            Atributos
          </h2>
          <div className="rounded-[22px] bg-card p-4">
            <PlayerStats player={player} />
          </div>
        </section>
      </div>
    </div>
  );
}
