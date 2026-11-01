"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { renewContractAction, setRenewalPercentAction } from "@/app/actions/contracts";
import { TIERS, type RenewalTable } from "@/lib/contracts";
import { formatMoney } from "@/lib/format/money";
import { TIER_CONTRACT_DURATIONS, TIER_FIXED_PRICES } from "@/lib/players";
import type { ExpiredContract } from "@/lib/data/contracts";
import { canActFor, useViewer } from "@/components/auth/ViewerProvider";

function short(v: number) {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  return formatMoney(v);
}

/** Lo que cuesta renovar cada nivel (en % de su precio), editable por los admins. */
export function RenewalsEditor({ leagueId, initial }: { leagueId: string; initial: RenewalTable }) {
  const canEdit = !!useViewer()?.isAdmin;
  const tiers = TIERS.filter((t) => TIER_CONTRACT_DURATIONS[t] > 0);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(tiers.map((t) => [t, String(initial[t])])));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = Object.fromEntries(
    tiers.map((t) => {
      const n = Number(draft[t].replace(",", "."));
      return [t, draft[t].trim() === "" ? 0 : Number.isFinite(n) && n >= 0 && n <= 100 ? n : null];
    }),
  ) as Record<string, number | null>;
  const invalid = tiers.some((t) => parsed[t] === null);
  const dirty = tiers.some((t) => parsed[t] !== saved[t]);

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const next = { ...saved };
        for (const t of tiers) {
          if (parsed[t] === saved[t]) continue;
          next[t] = await setRenewalPercentAction(leagueId, t, parsed[t] as number);
        }
        setSaved(next);
        setMessage({ ok: true, text: "Renovaciones guardadas." });
      } catch (err) {
        setMessage({ ok: false, text: err instanceof Error ? err.message : "No se pudieron guardar las renovaciones." });
      }
    });
  }

  return (
    <section aria-labelledby="fin-renewals">
      <h2 id="fin-renewals" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
        Renovaciones
      </h2>
      <ul className="overflow-hidden rounded-[22px] bg-card">
        {tiers.map((t) => {
          const pct = parsed[t];
          const years = TIER_CONTRACT_DURATIONS[t];
          return (
            <li key={t} className="flex min-h-[64px] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
              <span className="w-8 shrink-0 text-[length:min(1rem,25.5px)] font-bold">{t}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[length:min(0.8824rem,22.5px)]">
                  {pct === null ? "—" : short(Math.round((TIER_FIXED_PRICES[t] * pct) / 100))}
                  <span className="text-muted-foreground"> por renovar</span>
                </p>
                <p className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                  Contrato de {years} {years === 1 ? "temporada" : "temporadas"}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-1">
                <span className="sr-only">Renovación de nivel {t} en % del precio</span>
                <input
                  inputMode="decimal"
                  readOnly={!canEdit}
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
        <p
          aria-live="polite"
          className={`text-[length:min(0.7647rem,19.5px)] ${message ? (message.ok ? "text-[#30d158]" : "text-destructive") : "text-muted-foreground"}`}
        >
          {message?.text ??
            (invalid
              ? "Escribe un porcentaje entre 0 y 100."
              : "% del precio del jugador. Los jugadores no cobran sueldo: cada contrato cumple un año en el mercado en el que fichó (invierno o inicio de temporada) y, cuando se acaba, su club decide si lo renueva. C y D no tienen contrato.")}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={save}
            disabled={pending || invalid || !dirty}
            className="h-11 shrink-0 rounded-full bg-white px-5 text-[length:min(0.8824rem,22.5px)] font-semibold text-black disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>
    </section>
  );
}

/** Contratos acabados sin renovar: su club (o un admin) puede renovarlos aquí. */
export function ExpiredContracts({ rows }: { rows: ExpiredContract[] }) {
  const viewer = useViewer();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!rows.length) return null;

  async function renew(row: ExpiredContract) {
    setBusy(row.playerId);
    setMessage(null);
    try {
      const { cost } = await renewContractAction(row.playerId);
      setMessage({ ok: true, text: `${row.playerName} renovado por ${formatMoney(cost)}.` });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "No se pudo renovar." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="fin-expired">
      <h2 id="fin-expired" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
        Contratos acabados
      </h2>
      <ul className="overflow-hidden rounded-[22px] bg-card">
        {rows.map((r) => {
          const mine = canActFor(viewer, r.teamId);
          return (
            <li key={r.playerId} className="flex min-h-[64px] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <Link href={`/players/${r.playerId}`} className="block truncate text-[length:min(1rem,25.5px)] active:opacity-50">
                  {r.playerName}
                </Link>
                <p className="text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                  {r.teamName} · {r.position} · renovar {short(r.cost)}
                </p>
              </div>
              {mine && (
                <button
                  type="button"
                  onClick={() => renew(r)}
                  disabled={busy !== null}
                  className="h-11 shrink-0 rounded-full bg-white px-4 text-[length:min(0.8824rem,22.5px)] font-semibold text-black disabled:opacity-40"
                >
                  {busy === r.playerId ? "Renovando…" : "Renovar"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p
        aria-live="polite"
        className={`mt-2 px-4 text-[length:min(0.7647rem,19.5px)] ${message ? (message.ok ? "text-[#30d158]" : "text-destructive") : "text-muted-foreground"}`}
      >
        {message?.text ?? "Si no lo renuevas, el jugador sigue en tu club con el contrato acabado. Para dejarlo ir, libéralo desde su ficha."}
      </p>
    </section>
  );
}
