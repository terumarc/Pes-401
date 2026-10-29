import {
  ArrowLeftRight,
  Award,
  CircleSlash,
  FileSignature,
  HandCoins,
  Medal,
  SlidersHorizontal,
  Swords,
  Trophy,
  UserMinus,
  UserPlus,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { amountFor, movesMoney, type ActivityRow } from "@/lib/data/activity";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";

const KIND: Record<string, { Icon: LucideIcon; tint: string }> = {
  signing: { Icon: UserPlus, tint: "#30d158" },
  release: { Icon: UserMinus, tint: "#ff9f0a" },
  transfer: { Icon: ArrowLeftRight, tint: "#0a84ff" },
  contract_released: { Icon: UserX, tint: "#ff453a" },
  offer_made: { Icon: HandCoins, tint: "#bf5af2" },
  offer_accepted: { Icon: HandCoins, tint: "#30d158" },
  offer_rejected: { Icon: HandCoins, tint: "#ff453a" },
  offer_cancelled: { Icon: CircleSlash, tint: "#8e8e93" },
  offer_expired: { Icon: CircleSlash, tint: "#8e8e93" },
  match: { Icon: Swords, tint: "#ffffff" },
  cup_match: { Icon: Medal, tint: "#ffd60a" },
  salary: { Icon: Wallet, tint: "#ff9f0a" },
  renewal: { Icon: FileSignature, tint: "#ff9f0a" },
  prize_position: { Icon: Award, tint: "#30d158" },
  trophy: { Icon: Trophy, tint: "#e8b341" },
  trophy_removed: { Icon: Trophy, tint: "#8e8e93" },
  budget_adjust: { Icon: SlidersHorizontal, tint: "#64d2ff" },
};

// La liga es en España: fechas y horas en hora de Madrid aunque el servidor esté en UTC.
const TZ = "Europe/Madrid";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayName = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const timeOf = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

function dayLabel(d: Date) {
  const key = dayKey.format(d);
  const now = new Date();
  if (key === dayKey.format(now)) return "Hoy";
  if (key === dayKey.format(new Date(now.getTime() - 86_400_000))) return "Ayer";
  const label = dayName.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function signed(n: number) {
  return `${n > 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`;
}

/**
 * Movimientos agrupados por día. Con `teamId`, el dinero se muestra desde el
 * punto de vista de ese club (+ entra, − sale).
 */
export function ActivityList({
  rows,
  teamId,
  emptyTitle = "Sin movimientos todavía",
  emptyText = "Aquí aparecerán los fichajes, ofertas, resultados, sueldos y premios.",
}: {
  rows: ActivityRow[];
  teamId?: string | null;
  emptyTitle?: string;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[22px] bg-card px-6 py-10 text-center">
        <p className="text-[length:min(1rem,25.5px)] font-semibold">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-xs text-[length:min(0.8824rem,22.5px)] text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  const groups: { label: string; items: ActivityRow[] }[] = [];
  for (const row of rows) {
    const label = dayLabel(new Date(row.created_at));
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(row);
    else groups.push({ label, items: [row] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="mb-1.5 px-4 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">{g.label}</h2>
          <ul className="overflow-hidden rounded-[22px] bg-card">
            {g.items.map((row) => {
              const meta = KIND[row.kind] ?? { Icon: Wallet, tint: "#8e8e93" };
              const money = amountFor(row, teamId);
              const neutralAmount = !movesMoney(row) && row.amount ? row.amount : null;
              return (
                <li key={row.id} className="group flex items-start gap-3 pl-4">
                  <span
                    aria-hidden
                    className="mt-3 flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${meta.tint}1f`, color: meta.tint }}
                  >
                    <meta.Icon className="size-[17px]" strokeWidth={2.1} />
                  </span>
                  <div className="flex min-h-[60px] min-w-0 flex-1 items-start gap-3 border-b border-border py-2.5 pr-4 group-last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[length:min(0.8824rem,22.5px)] leading-snug">{row.title}</p>
                      <p className="mt-0.5 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                        {timeOf.format(new Date(row.created_at))}
                        {row.actor_name ? ` · ${row.actor_name}` : ""}
                        {row.as_admin && <span className="text-[#ff9f0a]"> · como admin</span>}
                        {row.private && " · solo lo ven los dos clubes"}
                      </p>
                    </div>
                    {money != null && (
                      <span
                        className={cn(
                          "shrink-0 pt-0.5 text-[length:min(0.8824rem,22.5px)] font-semibold tabular-nums",
                          !teamId ? "text-foreground" : money > 0 ? "text-[#30d158]" : "text-[#ff453a]",
                        )}
                      >
                        {teamId ? signed(money) : formatMoney(Math.abs(money))}
                      </span>
                    )}
                    {neutralAmount != null && (
                      <span className="shrink-0 pt-0.5 text-[length:min(0.8824rem,22.5px)] tabular-nums text-muted-foreground">
                        {formatMoney(neutralAmount)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
