"use client";

import { useState, useTransition } from "react";
import { setContractSalaryAction } from "@/app/actions/contracts";
import { TIERS, type SalaryTable } from "@/lib/contracts";
import { formatMoney } from "@/lib/format/money";
import { TIER_CONTRACT_DURATIONS, TIER_FIXED_PRICES, TIER_RENEWAL_PERCENTAGES } from "@/lib/players";
import type { ContractEvent } from "@/lib/data/contracts";

function short(v: number) {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  return formatMoney(v);
}

/** Sueldo por temporada de cada nivel, editable. */
export function SalariesEditor({ leagueId, initial }: { leagueId: string; initial: SalaryTable }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(TIERS.map((t) => [t, String(initial[t])])),
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = Object.fromEntries(
    TIERS.map((t) => {
      const n = Number(draft[t].replace(",", "."));
      return [t, draft[t].trim() === "" ? 0 : Number.isFinite(n) && n >= 0 && n <= 100 ? n : null];
    }),
  ) as Record<string, number | null>;
  const invalid = TIERS.some((t) => parsed[t] === null);
  const dirty = TIERS.some((t) => parsed[t] !== saved[t]);

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const next = { ...saved };
        for (const t of TIERS) {
          if (parsed[t] === saved[t]) continue;
          next[t] = await setContractSalaryAction(leagueId, t, parsed[t] as number);
        }
        setSaved(next);
        setMessage({ ok: true, text: "Sueldos guardados." });
      } catch (err) {
        setMessage({ ok: false, text: err instanceof Error ? err.message : "No se pudieron guardar los sueldos." });
      }
    });
  }

  return (
    <section aria-labelledby="fin-salaries">
      <h2 id="fin-salaries" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
        Sueldos por temporada
      </h2>
      <ul className="overflow-hidden rounded-[22px] bg-card">
        {TIERS.map((t) => {
          const pct = parsed[t];
          const years = TIER_CONTRACT_DURATIONS[t];
          const renewal = Math.round(TIER_FIXED_PRICES[t] * TIER_RENEWAL_PERCENTAGES[t]);
          return (
            <li key={t} className="flex min-h-[64px] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
              <span className="w-8 shrink-0 text-[length:min(1rem,25.5px)] font-bold">{t}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[length:min(0.8824rem,22.5px)]">
                  {pct === null ? "—" : short(Math.round((TIER_FIXED_PRICES[t] * pct) / 100))}
                  <span className="text-muted-foreground"> por temporada</span>
                </p>
                <p className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                  {years > 0
                    ? `Contrato de ${years} ${years === 1 ? "temporada" : "temporadas"} · renovar ${short(renewal)}`
                    : "Sin contrato"}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-1">
                <span className="sr-only">Sueldo de nivel {t} en % del precio</span>
                <input
                  inputMode="decimal"
                  value={draft[t]}
                  aria-invalid={pct === null || undefined}
                  onChange={(e) => {
                    setMessage(null);
                    setDraft((d) => ({ ...d, [t]: e.target.value }));
                  }}
                  className="h-11 w-16 rounded-[10px] bg-input px-2 text-right text-[length:min(1rem,25.5px)] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive"
                />
                <span className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">%</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-3 px-4">
        <p aria-live="polite" className={`text-[length:min(0.7647rem,19.5px)] ${message ? (message.ok ? "text-[#30d158]" : "text-destructive") : "text-muted-foreground"}`}>
          {message?.text ??
            (invalid
              ? "Escribe un porcentaje entre 0 y 100."
              : "% del precio del jugador. Se cobra al acabar cada temporada; si el club no puede pagar, el jugador queda libre.")}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={pending || invalid || !dirty}
          className="h-11 shrink-0 rounded-full bg-white px-5 text-[length:min(0.8824rem,22.5px)] font-semibold text-black disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </section>
  );
}

/** Lo que se cobró en el último cierre de temporada, por club. */
export function LastClosure({ events }: { events: ContractEvent[] }) {
  if (!events.length) return null;
  const byTeam = new Map<string, { paid: number; released: string[]; renewals: string[] }>();
  for (const e of events) {
    const row = byTeam.get(e.team_name) ?? { paid: 0, released: [], renewals: [] };
    row.paid += e.kind === "released" ? 0 : Number(e.amount);
    if (e.kind === "released") row.released.push(e.player_name);
    if (e.kind === "renewal") row.renewals.push(e.player_name);
    byTeam.set(e.team_name, row);
  }
  const rows = [...byTeam.entries()].sort((a, b) => b[1].paid - a[1].paid);
  const date = new Date(events[0].created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  return (
    <section aria-labelledby="fin-closure">
      <h2 id="fin-closure" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
        Último cierre de temporada
      </h2>
      <ul className="overflow-hidden rounded-[22px] bg-card">
        {rows.map(([team, r]) => (
          <li key={team} className="border-b border-border px-4 py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[length:min(1rem,25.5px)]">{team}</span>
              <span className="text-[length:min(1rem,25.5px)] font-semibold tabular-nums">−{short(r.paid)}</span>
            </div>
            {(r.renewals.length > 0 || r.released.length > 0) && (
              <p className="mt-0.5 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                {r.renewals.length > 0 && `Renovados: ${r.renewals.join(", ")}`}
                {r.renewals.length > 0 && r.released.length > 0 && " · "}
                {r.released.length > 0 && <span className="text-destructive">Libres por falta de dinero: {r.released.join(", ")}</span>}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 px-4 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Aplicado el {date}.</p>
    </section>
  );
}
