"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { CaniLeagueCrest } from "@/components/brand/CaniLeagueCrest";
import { TeamLogo } from "@/components/teams/TeamCard";
import { completeProfileAction } from "@/app/actions/profile";
import { cn } from "@/lib/utils";

export type ClubChoice = {
  id: string;
  name: string;
  color: string;
  logoUrl: string | null;
  /** Nombre de quien ya lo lleva en la app. */
  takenBy: string | null;
  /** Dueño apuntado en el club, para reconocer el tuyo. */
  hint: string | null;
};

/** Primera entrada: cómo te llamamos y cuál es tu club. Mismo estilo que el resto de la app. */
export function WelcomeScreen({
  name: initialName,
  isAdmin,
  clubs,
  next,
}: {
  name: string;
  isAdmin: boolean;
  clubs: ClubChoice[];
  next: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const free = clubs.filter((c) => !c.takenBy);
  const chosen = clubs.find((c) => c.id === teamId) ?? null;

  function save(withoutClub = false) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await completeProfileAction(name, withoutClub ? null : teamId);
        if (!res.ok) {
          setError(res.error);
          if (/dueño/.test(res.error)) {
            setTeamId(null);
            router.refresh();
          }
          return;
        }
        router.replace(next);
        router.refresh();
      } catch {
        setError("No hay conexión. Revisa tu internet y vuelve a intentarlo.");
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground">
      {/* Al elegir club, su color se funde con el fondo, como en la ficha de club. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[22rem] transition-[background] duration-500"
        style={{
          background: chosen
            ? `linear-gradient(180deg, ${chosen.color}66 0%, transparent 85%)`
            : "linear-gradient(180deg, rgba(245,190,70,0.14) 0%, transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md animate-fade-up">
        <header className="flex flex-col items-center pt-4 text-center">
          <div className="flex h-20 items-center justify-center">
            {chosen ? (
              <span key={chosen.id} className="animate-fade-up">
                <TeamLogo name={chosen.name} logoUrl={chosen.logoUrl} color={chosen.color} size="xl" />
              </span>
            ) : (
              <CaniLeagueCrest title="" className="h-20 w-auto" />
            )}
          </div>
          <h1 className="mt-3 text-[length:min(1.6471rem,42px)] leading-tight font-bold tracking-tight">
            {chosen ? chosen.name : "Bienvenido a la liga"}
          </h1>
          <p className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground [text-wrap:balance]">
            {chosen ? `${name.trim() || "Tú"} · Cani League` : "Dinos cómo te llamamos y cuál es tu club. Lo hacemos una sola vez."}
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (teamId && !pending) save();
          }}
          className="mt-7 space-y-6"
        >
          <section aria-labelledby="w-name" className="rounded-[22px] bg-card p-5">
            <h2 id="w-name" className="text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
              Tu nombre
            </h2>
            <label htmlFor="welcome-name" className="mt-1 block text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
              El que verán los demás en los movimientos.
            </label>
            <input
              id="welcome-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="nickname"
              enterKeyHint="next"
              placeholder="Cómo te llaman en el grupo"
              className="mt-4 h-11 w-full rounded-[10px] bg-input px-3 text-[length:min(1rem,25.5px)] caret-[#0a84ff] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          </section>

          <section aria-labelledby="w-club">
            <h2 id="w-club" className="mb-2 px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
              Tu club
            </h2>
            {free.length === 0 && (
              <p className="mb-3 px-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
                Todos los clubes tienen dueño. Pide a un admin que te asigne uno.
              </p>
            )}
            <ul role="radiogroup" aria-labelledby="w-club" className="overflow-hidden rounded-[22px] bg-card">
              {clubs.map((c) => {
                const selected = teamId === c.id;
                const taken = !!c.takenBy;
                return (
                  <li key={c.id} className="group">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={taken || pending}
                      onClick={() => setTeamId(c.id)}
                      style={selected ? { background: `linear-gradient(90deg, ${c.color}40, transparent 80%)` } : undefined}
                      className={cn(
                        "flex min-h-[68px] w-full items-center gap-3 pl-4 text-left outline-none transition-colors active:bg-white/[0.06] focus-visible:bg-white/[0.06]",
                        taken && "opacity-45",
                      )}
                    >
                      <span className="shrink-0 large-text:self-start large-text:pt-3">
                        <TeamLogo name={c.name} logoUrl={c.logoUrl} color={c.color} size="md" />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border py-3 pr-4 group-last:border-b-0">
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-[length:min(1rem,25.5px)] font-semibold leading-tight">{c.name}</span>
                          <span className="line-clamp-2 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                            {taken ? `Lo lleva ${c.takenBy}` : c.hint ? `Apuntado como ${c.hint}` : "Libre"}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          style={selected ? { backgroundColor: c.color } : undefined}
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-white",
                            selected ? "shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.85)]" : "ring-1 ring-inset ring-[#48484a]",
                            taken && "invisible",
                          )}
                        >
                          {selected && <Check className="size-4" strokeWidth={3} />}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {error && (
            <p role="alert" className="px-1 text-[length:min(0.8824rem,22.5px)] text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-2 pb-4">
            <button
              type="submit"
              disabled={!teamId || pending}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black outline-none transition-opacity active:opacity-80 disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/60"
            >
              {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
              {pending ? "Guardando…" : "Empezar"}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => save(true)}
                disabled={pending}
                className="h-11 w-full rounded-full text-[length:min(1rem,25.5px)] text-[#0a84ff] outline-none active:opacity-50 disabled:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                No tengo club, solo administro
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
