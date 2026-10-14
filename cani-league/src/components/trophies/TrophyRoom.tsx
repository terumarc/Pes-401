"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Pencil, Plus } from "lucide-react";
import { TeamLogo } from "@/components/teams/TeamCard";
import { TrophyArt } from "@/components/trophies/TrophyArt";
import { changeTeamTrophyAction, setTrophyPrizeAction } from "@/app/actions/trophies";
import { formatMoney, parseMoneyInput } from "@/lib/format/money";
import { TROPHIES } from "@/constants";
import { cn } from "@/lib/utils";
import type { TeamTrophyCabinet, TrophyCounts, TrophyType } from "@/types";

/* ------------------------------------------------------------------ */
/* Estética de menú PES 6: azul marino brillante, barras inclinadas,   */
/* cursiva gruesa en mayúsculas y selección amarilla-naranja.          */
/* ------------------------------------------------------------------ */

const ACCENT: Record<TrophyType, { stripe: string; glow: string }> = {
  league: { stripe: "#f5c542", glow: "rgba(245,197,66,0.55)" },
  champions: { stripe: "#9cc7ff", glow: "rgba(120,180,255,0.55)" },
  cup: { stripe: "#ff4d5e", glow: "rgba(255,77,94,0.5)" },
  conference: { stripe: "#3ee6a0", glow: "rgba(62,230,160,0.5)" },
};

const PANEL_BG =
  "linear-gradient(180deg,#123073 0%,#0a1f52 38%,#061538 100%)";
const SCANLINES =
  "repeating-linear-gradient(0deg,rgba(255,255,255,0.035) 0 1px,transparent 1px 3px)";
const SELECT_BG = "linear-gradient(180deg,#fff27a 0%,#ffd12e 45%,#f59a00 100%)";
const TITLE_BG = "linear-gradient(180deg,#3d7be0 0%,#1d4fae 50%,#123a8a 51%,#0d2c6e 100%)";
const NUM_SHADOW =
  "0 2px 0 #0a1a44, 0 0 10px rgba(80,170,255,0.75), 0 0 2px #000";

function sortCabinets(list: TeamTrophyCabinet[]) {
  return [...list].sort(
    (a, b) =>
      b.total - a.total ||
      b.trophies.champions - a.trophies.champions ||
      b.trophies.league - a.trophies.league ||
      a.team.name.localeCompare(b.team.name),
  );
}

function compactMoney(value: number) {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(".", ",")}M €`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k €`;
  return `${value} €`;
}

/** Panel con biselado y brillo, como las ventanas del menú. */
function PesPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[3px] border border-[#3b72d6]", className)}
      style={{
        background: PANEL_BG,
        boxShadow:
          "inset 0 1px 0 rgba(170,210,255,0.45), inset 0 0 0 1px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.55)",
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SCANLINES }} />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Barra de título inclinada con brillo de cristal en la mitad superior. */
function PesTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-stretch justify-between gap-2 border-b border-black/40">
      <div
        className="-ml-2 flex items-center py-1.5 pl-5 pr-7"
        style={{
          background: TITLE_BG,
          clipPath: "polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        <span className="font-display text-sm font-black uppercase italic tracking-wide text-white drop-shadow-[0_1px_0_#06143a] sm:text-base">
          {children}
        </span>
      </div>
      {right && <div className="flex items-center pr-3">{right}</div>}
    </div>
  );
}

function PesButton({
  children,
  onClick,
  active,
  disabled,
  label,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex -skew-x-12 items-center justify-center gap-1.5 border px-3 py-1.5 font-display text-xs font-black uppercase italic tracking-wide transition-[filter] hover:brightness-110 disabled:opacity-35 disabled:hover:brightness-100",
        active ? "border-[#ffe680] text-[#0a1430]" : "border-[#5d93ef] text-white",
        className,
      )}
      style={{
        background: active ? SELECT_BG : TITLE_BG,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 0 rgba(0,0,0,0.5)",
      }}
    >
      <span className="flex skew-x-12 items-center gap-1.5">{children}</span>
    </button>
  );
}

export function TrophyRoom({
  leagueId,
  initialCabinets,
  initialPrizes,
}: {
  leagueId: string;
  initialCabinets: TeamTrophyCabinet[];
  initialPrizes: TrophyCounts;
}) {
  const [cabinets, setCabinets] = useState(initialCabinets);
  const [prizes, setPrizes] = useState(initialPrizes);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(
    () => sortCabinets(initialCabinets)[0]?.team.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ranking = useMemo(() => sortCabinets(cabinets), [cabinets]);
  const selected = cabinets.find((c) => c.team.id === selectedId) ?? ranking[0];

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay equipos en la liga todavía.
      </p>
    );
  }

  function applyResult(teamId: string, trophy: TrophyType, count: number, budget: number) {
    setCabinets((prev) =>
      prev.map((c) => {
        if (c.team.id !== teamId) return c;
        const trophies = { ...c.trophies, [trophy]: count };
        const total = Object.values(trophies).reduce((a, b) => a + b, 0);
        return { ...c, trophies, total, team: { ...c.team, budget } };
      }),
    );
  }

  function changeCount(trophy: TrophyType, delta: number) {
    const teamId = selected.team.id;
    const teamName = selected.team.name;
    if (pending) return;
    if (delta < 0 && selected.trophies[trophy] === 0) return;

    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await changeTeamTrophyAction(teamId, trophy, delta);
        applyResult(teamId, trophy, res.count, res.budget);
        if (res.budgetDelta > 0) {
          setNotice(`+${formatMoney(res.budgetDelta)} al presupuesto de ${teamName}`);
        } else if (res.budgetDelta < 0) {
          setNotice(`${formatMoney(res.budgetDelta)} descontados a ${teamName}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  async function savePrize(trophy: TrophyType, value: number) {
    const previous = prizes[trophy];
    setPrizes((p) => ({ ...p, [trophy]: value }));
    try {
      const saved = await setTrophyPrizeAction(leagueId, trophy, value);
      setPrizes((p) => ({ ...p, [trophy]: saved }));
    } catch (err) {
      setPrizes((p) => ({ ...p, [trophy]: previous }));
      setError(err instanceof Error ? err.message : "No se pudo guardar el premio");
    }
  }

  return (
    <div className="space-y-5">
      {/* Selector de club */}
      <div className="-mx-4 overflow-x-auto px-5 py-1 sm:mx-0 sm:px-1">
        <div className="flex gap-2.5">
          {ranking.map((c) => {
            const active = c.team.id === selected.team.id;
            return (
              <button
                key={c.team.id}
                type="button"
                onClick={() => setSelectedId(c.team.id)}
                className={cn(
                  "flex shrink-0 -skew-x-12 items-center border transition-[filter] hover:brightness-110",
                  active ? "border-[#ffe680]" : "border-[#2f5fb8]",
                )}
                style={{
                  background: active ? SELECT_BG : PANEL_BG,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 0 rgba(0,0,0,0.5)",
                }}
              >
                <span className="flex skew-x-12 items-center gap-2 py-1 pl-2 pr-3">
                  <TeamLogo
                    name={c.team.name}
                    logoUrl={c.team.logo_url}
                    color={c.team.primary_color}
                    size="sm"
                  />
                  <span
                    className={cn(
                      "font-display text-sm font-black uppercase italic",
                      active ? "text-[#0a1430]" : "text-white",
                    )}
                  >
                    {c.team.short_name || c.team.name}
                  </span>
                  <span
                    className={cn(
                      "min-w-6 px-1 text-center font-display text-xs font-black italic tabular-nums",
                      active ? "bg-[#0a1430] text-[#ffd12e]" : "bg-black/40 text-[#8fc4ff]",
                    )}
                  >
                    {c.total}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vitrina */}
      <PesPanel>
        <PesTitle
          right={
            <span className="flex items-center gap-2">
              <span className="hidden font-display text-[11px] font-bold uppercase italic tracking-wider text-[#8fc4ff] sm:inline">
                Títulos
              </span>
              <span
                className="-skew-x-12 border border-[#ffe680] px-2.5 py-0.5"
                style={{ background: SELECT_BG }}
              >
                <span className="block skew-x-12 font-display text-base font-black italic tabular-nums text-[#0a1430]">
                  {selected.total}
                </span>
              </span>
            </span>
          }
        >
          Sala de trofeos
        </PesTitle>

        {/* Ficha del club */}
        <div className="flex items-center gap-3 border-b border-[#2a5bb5]/60 bg-black/20 px-3 py-2.5 sm:px-4">
          <TeamLogo
            name={selected.team.name}
            logoUrl={selected.team.logo_url}
            color={selected.team.primary_color}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-black uppercase italic leading-tight text-white drop-shadow-[0_2px_0_#06143a] sm:text-xl">
              {selected.team.name}
            </p>
            <p className="font-display text-[11px] font-bold uppercase italic tracking-wider text-[#8fc4ff]">
              Presupuesto <span className="text-[#ffd12e] tabular-nums">{formatMoney(selected.team.budget)}</span>
            </p>
          </div>
        </div>

        {/* Expositores */}
        <div
          className="relative grid grid-cols-2 gap-x-2 gap-y-4 px-2 pb-4 pt-5 sm:grid-cols-4 sm:gap-x-4 sm:px-5 sm:pt-7"
          style={{
            background:
              "radial-gradient(90% 60% at 50% 100%, rgba(40,110,230,0.35), transparent 70%)",
          }}
        >
          {TROPHIES.map((t) => (
            <TrophyStand
              key={t.key}
              type={t.key}
              label={t.short}
              count={selected.trophies[t.key]}
              prize={prizes[t.key]}
            />
          ))}
        </div>

        {/* Barra inferior */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t border-black/40 px-3 py-2"
          style={{ background: "linear-gradient(180deg,#0b2154,#071637)" }}
        >
          <p className="font-display text-[11px] font-bold uppercase italic tracking-wide text-[#8fc4ff]">
            {pending ? "Guardando…" : "Elige un club para ver su vitrina"}
          </p>
          <PesButton
            onClick={() =>
              document.getElementById("gestion-titulos")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <Pencil className="size-3.5" />
            Gestionar títulos
          </PesButton>
        </div>
      </PesPanel>

      {/* Gestión manual */}
      <div id="gestion-titulos" className="scroll-mt-20">
        <PesPanel>
          <PesTitle>Gestión de títulos</PesTitle>

          <div className="space-y-3 p-3 sm:p-4">
            <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="font-display text-[11px] font-black uppercase italic tracking-wider text-[#8fc4ff]">
                Club
              </span>
              <select
                value={selected.team.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-10 flex-1 border border-[#3b72d6] bg-[#04102c] px-3 font-display text-sm font-black uppercase italic text-white outline-none focus:border-[#ffd12e]"
              >
                {ranking.map((c) => (
                  <option key={c.team.id} value={c.team.id}>
                    {c.team.name}
                  </option>
                ))}
              </select>
            </label>

            <ul className="divide-y divide-[#2a5bb5]/40 border border-[#2a5bb5]/60 bg-black/20">
              {TROPHIES.map((t) => (
                <TitleRow
                  key={t.key}
                  type={t.key}
                  label={t.label}
                  count={selected.trophies[t.key]}
                  prize={prizes[t.key]}
                  disabled={pending}
                  onChange={(delta) => changeCount(t.key, delta)}
                />
              ))}
            </ul>

            {notice && (
              <div className="-skew-x-6 border border-[#3ee6a0]/60 bg-[#06331f]/80 px-3 py-2">
                <p className="skew-x-6 font-display text-xs font-bold uppercase italic text-[#7dffc4]">
                  {notice}
                </p>
              </div>
            )}
            {error && (
              <div className="-skew-x-6 border border-[#ff4d5e]/60 bg-[#3a0710]/80 px-3 py-2">
                <p className="skew-x-6 text-xs font-semibold text-[#ffb3bb]">{error}</p>
              </div>
            )}
            <p className="text-[11px] text-[#b9d6ff]/80">
              Al sumar un título, su valor se añade al presupuesto del club. Si lo
              quitas, se descuenta.
            </p>
          </div>

          <PrizeEditor prizes={prizes} onSave={savePrize} />
        </PesPanel>
      </div>

      {/* Palmarés */}
      <PesPanel>
        <PesTitle>Palmarés</PesTitle>
        <div className="grid grid-cols-[1.75rem_1fr_repeat(4,2.1rem)_2.4rem] items-center gap-x-1 border-b border-[#2a5bb5]/60 bg-black/25 px-2 py-1.5 font-display text-[10px] font-bold uppercase italic tracking-wider text-[#8fc4ff] sm:grid-cols-[2.5rem_1fr_repeat(4,3.5rem)_3.5rem] sm:px-3">
          <span>Pos</span>
          <span>Club</span>
          {TROPHIES.map((t) => (
            <span key={t.key} className="flex justify-center" title={t.label}>
              <TrophyArt type={t.key} className="h-5 w-4" />
            </span>
          ))}
          <span className="text-right">Tot</span>
        </div>
        <ul>
          {ranking.map((c, idx) => {
            const active = c.team.id === selected.team.id;
            return (
              <li key={c.team.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(c.team.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={cn(
                    "grid w-full grid-cols-[1.75rem_1fr_repeat(4,2.1rem)_2.4rem] items-center gap-x-1 px-2 py-1.5 text-left sm:grid-cols-[2.5rem_1fr_repeat(4,3.5rem)_3.5rem] sm:px-3",
                    active ? "text-[#0a1430]" : idx % 2 ? "bg-white/[0.035] text-white" : "text-white",
                  )}
                  style={active ? { background: SELECT_BG } : undefined}
                >
                  <span className="font-display text-base font-black italic tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamLogo
                      name={c.team.name}
                      logoUrl={c.team.logo_url}
                      color={c.team.primary_color}
                      size="sm"
                    />
                    <span className="truncate font-display text-sm font-bold uppercase italic">
                      {c.team.name}
                    </span>
                  </span>
                  {TROPHIES.map((t) => (
                    <span
                      key={t.key}
                      className={cn(
                        "text-center font-display text-sm font-black italic tabular-nums",
                        !c.trophies[t.key] && (active ? "text-[#0a1430]/40" : "text-white/25"),
                      )}
                    >
                      {c.trophies[t.key]}
                    </span>
                  ))}
                  <span
                    className={cn(
                      "text-right font-display text-base font-black italic tabular-nums",
                      !active && "text-[#ffd12e]",
                    )}
                  >
                    {c.total}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PesPanel>
    </div>
  );
}

function TrophyStand({
  type,
  label,
  count,
  prize,
}: {
  type: TrophyType;
  label: string;
  count: number;
  prize: number;
}) {
  const accent = ACCENT[type];
  const won = count > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Pestaña con el nombre */}
      <div
        className="mb-1 w-full max-w-[10rem] -skew-x-12 border-l-4 py-1"
        style={{
          borderColor: accent.stripe,
          background: "linear-gradient(90deg,rgba(10,26,68,0.95),rgba(29,79,174,0.75))",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        <p className="skew-x-12 text-center font-display text-[11px] font-black uppercase italic tracking-wider text-white sm:text-xs">
          {label}
        </p>
      </div>

      {/* Trofeo + plataforma + reflejo */}
      <div className="relative flex h-40 w-full flex-col items-center justify-end sm:h-52">
        {/* haz de luz */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 bottom-6"
          style={{
            background: won
              ? `radial-gradient(40% 70% at 50% 70%, ${accent.glow}, transparent 75%)`
              : "radial-gradient(40% 70% at 50% 70%, rgba(80,120,200,0.12), transparent 75%)",
          }}
        />
        <TrophyArt
          type={type}
          dimmed={!won}
          className="relative z-10 h-32 w-24 sm:h-44 sm:w-32"
        />
        {/* plataforma */}
        <div
          aria-hidden
          className="relative -mt-3 h-5 w-28 rounded-[50%] sm:w-36"
          style={{
            background: won
              ? `radial-gradient(50% 50% at 50% 50%, #ffffff 0%, ${accent.stripe} 25%, #1d4fae 60%, #0a1f52 100%)`
              : "radial-gradient(50% 50% at 50% 50%, #3a5a99 0%, #15306b 60%, #0a1f52 100%)",
            boxShadow: won ? `0 0 18px ${accent.glow}` : "none",
            opacity: won ? 0.9 : 0.6,
          }}
        />
      </div>
      {/* reflejo */}
      <div
        aria-hidden
        className="pointer-events-none -mt-1 h-10 w-full overflow-hidden sm:h-12"
        style={{
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.35), transparent 85%)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.35), transparent 85%)",
        }}
      >
        <TrophyArt
          type={type}
          dimmed={!won}
          className="mx-auto h-32 w-24 -scale-y-100 blur-[1px] sm:h-44 sm:w-32"
        />
      </div>

      {/* Contador */}
      <div className="-mt-6 flex items-center gap-2 sm:-mt-8">
        <span
          className={cn(
            "font-display text-4xl font-black italic tabular-nums leading-none sm:text-5xl",
            won ? "text-white" : "text-white/35",
          )}
          style={{ textShadow: won ? NUM_SHADOW : undefined }}
        >
          <span className="mr-0.5 text-xl sm:text-2xl">×</span>
          {count}
        </span>
      </div>
      <p className="mt-1 font-display text-[10px] font-bold uppercase italic tracking-wider text-[#8fc4ff] tabular-nums">
        {prize > 0 ? `Premio ${compactMoney(prize)}` : "Sin premio"}
      </p>
    </div>
  );
}

function PrizeEditor({
  prizes,
  onSave,
}: {
  prizes: TrophyCounts;
  onSave: (trophy: TrophyType, value: number) => void;
}) {
  return (
    <div className="border-t border-black/40">
      <PesTitle>Valor de cada título</PesTitle>
      <div className="p-3 sm:p-4">
        <p className="text-xs text-[#b9d6ff]">
          Lo que cobra un club por ganar cada competición. Se guarda al salir del
          campo. Admite «25000000», «25.000.000» o «25M».
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TROPHIES.map((t) => (
            <PrizeField
              key={`${t.key}-${prizes[t.key]}`}
              type={t.key}
              label={t.label}
              value={prizes[t.key]}
              onSave={(v) => onSave(t.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PrizeField({
  type,
  label,
  value,
  onSave,
}: {
  type: TrophyType;
  label: string;
  value: number;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  const [invalid, setInvalid] = useState(false);

  function commit() {
    const parsed = draft.trim() === "" ? 0 : parseMoneyInput(draft);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== value) onSave(parsed);
  }

  return (
    <label className="flex flex-col gap-1">
      <span
        className="border-l-4 pl-2 font-display text-xs font-black uppercase italic tracking-wide text-white"
        style={{ borderColor: ACCENT[type].stripe }}
      >
        {label}
      </span>
      <input
        inputMode="numeric"
        value={draft}
        placeholder="0"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(
          "h-9 border bg-[#04102c] px-3 font-display text-sm font-bold italic tabular-nums text-white outline-none focus:border-[#ffd12e] focus:shadow-[0_0_0_2px_rgba(255,209,46,0.35)]",
          invalid ? "border-[#ff4d5e]" : "border-[#3b72d6]",
        )}
      />
      <span
        className={cn(
          "font-display text-[11px] font-bold italic tabular-nums",
          invalid ? "text-[#ff8a96]" : "text-[#8fc4ff]",
        )}
      >
        {invalid ? "Cantidad no válida" : formatMoney(value)}
      </span>
    </label>
  );
}

function TitleRow({
  type,
  label,
  count,
  prize,
  disabled,
  onChange,
}: {
  type: TrophyType;
  label: string;
  count: number;
  prize: number;
  disabled: boolean;
  onChange: (delta: number) => void;
}) {
  return (
    <li className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3">
      <TrophyArt type={type} dimmed={count === 0} className="h-9 w-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <p
          className="border-l-4 pl-2 font-display text-xs font-black uppercase italic tracking-wide text-white sm:text-sm"
          style={{ borderColor: ACCENT[type].stripe }}
        >
          {label}
        </p>
        <p className="pl-3 font-display text-[10px] font-bold uppercase italic text-[#8fc4ff] tabular-nums">
          {prize > 0 ? `+${compactMoney(prize)} por título` : "Sin valor asignado"}
        </p>
      </div>
      <PesButton
        label={`Quitar un título de ${label}`}
        onClick={() => onChange(-1)}
        disabled={disabled || count === 0}
        className="px-2 py-1"
      >
        <Minus className="size-3.5" />
      </PesButton>
      <span
        className="w-8 text-center font-display text-2xl font-black italic tabular-nums text-white"
        style={{ textShadow: NUM_SHADOW }}
      >
        {count}
      </span>
      <PesButton
        label={`Sumar un título de ${label}`}
        onClick={() => onChange(1)}
        disabled={disabled}
        active
        className="px-2 py-1"
      >
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">Sumar</span>
      </PesButton>
    </li>
  );
}
