import Link from "next/link";
import { ArrowRight, Lock, Unlock } from "lucide-react";
import type { MarketWindow } from "@/lib/market-window";
import type { TransferRow } from "@/lib/data/market";
import { formatMoney } from "@/lib/format/money";

/** Aviso de la ventana de fichajes: abierta (verde) o cerrada (rojo), con el motivo. */
export function MarketBanner({ window }: { window: MarketWindow }) {
  const Icon = window.open ? Unlock : Lock;
  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-[22px] bg-card px-4 py-3">
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${window.open ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"}`}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-[length:min(1rem,25.5px)] font-semibold">{window.open ? "Mercado abierto" : "Mercado cerrado"}</p>
        <p className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">{window.reason}</p>
      </div>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

export function formatDay(iso: string) {
  return dateFmt.format(new Date(iso));
}

/** Historial de fichajes agrupado por mes. */
export function TransferHistory({ transfers }: { transfers: TransferRow[] }) {
  if (transfers.length === 0) {
    return (
      <div className="rounded-[22px] bg-card px-6 py-10 text-center">
        <p className="text-[length:min(1rem,25.5px)] font-semibold">Todavía no hay fichajes</p>
        <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">Aquí aparecerán compras, cláusulas, intercambios y despidos.</p>
      </div>
    );
  }

  const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
  const groups = new Map<string, TransferRow[]>();
  for (const t of transfers) {
    const key = monthFmt.format(new Date(t.created_at));
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  return (
    <div className="space-y-6">
      {[...groups].map(([month, rows]) => (
        <section key={month} aria-label={month}>
          <h2 className="mb-2 px-1 text-[length:min(0.7647rem,19.5px)] font-semibold uppercase tracking-wide text-muted-foreground first-letter:uppercase">
            {month}
          </h2>
          <ul className="overflow-hidden rounded-[22px] bg-card">
            {rows.map((t) => {
              const released = /liberado|libres/i.test(t.to_team_name ?? "");
              return (
                <li key={t.id} className="border-b border-border last:border-b-0">
                  <Link href={`/players/${t.player_id}`} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 active:bg-white/[0.06]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[length:min(1rem,25.5px)] leading-tight">{t.player_name}</p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                        <span className="truncate">{t.from_team_name ?? "—"}</span>
                        <ArrowRight className="size-3 shrink-0" aria-label="a" />
                        <span className="truncate">{released ? "Libre" : t.to_team_name ?? "—"}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-[length:min(0.8824rem,22.5px)] font-semibold tabular-nums ${released ? "text-muted-foreground" : ""}`}>
                        {t.fee > 0 ? formatMoney(t.fee) : released ? "Despido" : "Intercambio"}
                      </p>
                      <p className="text-[length:min(0.7059rem,18px)] text-muted-foreground">{formatDay(t.created_at)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
