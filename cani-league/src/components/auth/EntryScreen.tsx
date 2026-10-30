"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, User } from "lucide-react";
import { CaniLeagueCrest } from "@/components/brand/CaniLeagueCrest";
import { TeamLogo } from "@/components/teams/TeamCard";
import { joinClubAction } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";
import type { EntryClub } from "@/lib/data/entry";

const OFFLINE = "No hay conexión. Revisa tu internet y vuelve a intentarlo.";

/** Abre la sesión de este móvil (sin correo). Devuelve un error legible o null. */
async function ensureDeviceSession(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return null;
  const { error } = await supabase.auth.signInAnonymously();
  if (!error) return null;
  const code = (error as { code?: string }).code;
  if (code === "anonymous_provider_disabled") {
    return "La entrada sin correo aún no está activada en Supabase. Avisa al admin.";
  }
  if (error.status === 429) return "Demasiados intentos desde esta conexión. Espera un poco y vuelve a probar.";
  return "No se ha podido abrir la sesión en este móvil. Vuelve a intentarlo.";
}

/**
 * Entrada sin correo, códigos ni enlaces: eliges tu club y ya
 * estás dentro. Si está libre, pones tu nombre; si ya es tuyo (otro móvil),
 * entras directamente. Este móvil queda recordado.
 */
export function EntryScreen({
  season,
  clubs,
  next,
  initialError = null,
}: {
  season: string | null;
  clubs: EntryClub[];
  next: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [clubId, setClubId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();
  const [entering, setEntering] = useState(false);
  const club = clubs.find((c) => c.id === clubId) ?? null;
  const claiming = !!club && !club.owner;
  const busy = pending || entering;

  function pick(c: EntryClub) {
    setClubId(c.id);
    setError(null);
    setName(c.owner ? "" : (c.hint ?? ""));
    window.scrollTo({ top: 0 });
  }

  function back() {
    setClubId(null);
    setError(null);
  }

  function submit() {
    if (!club || busy) return;
    if (claiming && !name.trim()) {
      setError("Escribe tu nombre.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const sessionError = await ensureDeviceSession();
        if (sessionError) {
          setError(sessionError);
          return;
        }
        const res = await joinClubAction({ teamId: club.id, name: claiming ? name : null });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setEntering(true);
        router.replace(next);
        router.refresh();
      } catch {
        setError(OFFLINE);
      }
    });
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center bg-background px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground">
      {/* Con un club elegido, su color se funde con el fondo, como en la ficha de club. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] transition-[background] duration-500"
        style={{
          background: club
            ? `linear-gradient(180deg, ${club.color}66 0%, transparent 85%)`
            : "radial-gradient(60% 70% at 50% 0%, rgba(245,190,70,0.14), transparent 75%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {!club ? (
          <div key="pick" className="animate-fade-up">
            <header className="flex flex-col items-center pt-2 text-center">
              <CaniLeagueCrest className="h-24 w-auto drop-shadow-[0_6px_0_rgba(0,0,0,0.35)]" />
              <h1 className="mt-4 text-[length:min(2rem,51px)] leading-[1.1] font-bold tracking-[-0.02em]">Cani League</h1>
              <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
                {season ? `Temporada ${season}` : "La liga de PES 6 de los amigos"}
              </p>
            </header>

            <section aria-labelledby="entry-pick" className="mt-8">
              <h2 id="entry-pick" className="px-1 text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
                ¿Cuál es tu club?
              </h2>
              <p className="mt-0.5 mb-3 px-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground [text-wrap:pretty]">
                Elige el tuyo y ya estás dentro. Este móvil se queda recordado.
              </p>

              {error && (
                <p role="alert" className="mb-3 px-1 text-[length:min(0.8824rem,22.5px)] text-destructive">
                  {error}
                </p>
              )}

              {clubs.length === 0 ? (
                <p className="rounded-[22px] bg-card px-4 py-8 text-center text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
                  No se han podido cargar los clubes. Recarga la página.
                </p>
              ) : (
                <ul className="overflow-hidden rounded-[22px] bg-card">
                  {clubs.map((c) => {
                    return (
                      <li key={c.id} className="group">
                        <button
                          type="button"
                          onClick={() => pick(c)}
                          className="flex min-h-[68px] w-full items-center gap-3 pl-4 text-left outline-none transition-colors active:bg-white/[0.06] focus-visible:bg-white/[0.06] disabled:opacity-45 lg:hover:bg-white/[0.03]"
                        >
                          <span className="shrink-0 large-text:self-start large-text:pt-3">
                            <TeamLogo name={c.name} logoUrl={c.logoUrl} color={c.color} size="md" />
                          </span>
                          <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border py-3 pr-3 group-last:border-b-0">
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-[length:min(1rem,25.5px)] font-semibold leading-tight">{c.name}</span>
                              <span className="line-clamp-2 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                                {c.owner ? (
                                  <>
                                    <User className="mr-1 inline size-3 -translate-y-px" aria-hidden />
                                    {c.owner}
                                  </>
                                ) : c.hint ? (
                                  `Libre · apuntado como ${c.hint}`
                                ) : (
                                  "Libre"
                                )}
                              </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-[#5a5a5f]" aria-hidden />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <div key={club.id} className="animate-fade-up">
            <button
              type="button"
              onClick={back}
              disabled={busy}
              className="-ml-1 flex h-11 items-center gap-0.5 rounded-[10px] pr-2 text-[length:min(1rem,25.5px)] text-[#0a84ff] outline-none active:opacity-50 disabled:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <ChevronLeft className="size-6" strokeWidth={2.2} aria-hidden />
              Clubes
            </button>

            <header className="flex flex-col items-center pt-2 text-center">
              <TeamLogo name={club.name} logoUrl={club.logoUrl} color={club.color} size="xl" />
              <h1 className="mt-3 text-[length:min(1.6471rem,42px)] leading-tight font-bold tracking-tight">{club.name}</h1>
              <p className="text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
                {club.owner ? `Lo lleva ${club.owner}` : "Club libre"}
              </p>
            </header>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="mt-7 rounded-[22px] bg-card p-5"
            >
              {claiming ? (
                <>
                  <h2 className="text-[length:min(1.1765rem,30px)] font-bold tracking-tight">Es mi club</h2>
                  <label htmlFor="entry-name" className="mt-1 block text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
                    ¿Cómo te llamamos? Es el nombre que verán los demás.
                  </label>
                  <input
                    id="entry-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    maxLength={40}
                    autoComplete="nickname"
                    enterKeyHint="go"
                    placeholder="Cómo te llaman en el grupo"
                    disabled={busy}
                    aria-invalid={!!error || undefined}
                    className="mt-4 h-11 w-full rounded-[10px] bg-input px-3 text-[length:min(1rem,25.5px)] caret-[#0a84ff] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-60"
                  />
                </>
              ) : (
                <>
                  <h2 className="text-[length:min(1.1765rem,30px)] font-bold tracking-tight">¿Eres {club.owner}?</h2>
                  <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground [text-wrap:pretty]">
                    Entras en tu club también desde este móvil. A {club.owner} le llega un aviso, por si no eres tú.
                  </p>
                </>
              )}

              {error && (
                <p role="alert" className="mt-3 text-[length:min(0.8824rem,22.5px)] text-destructive [text-wrap:pretty]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || (claiming && !name.trim())}
                aria-busy={busy || undefined}
                className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black outline-none transition-opacity active:opacity-80 disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
                {entering ? "Entrando…" : busy ? "Guardando…" : claiming ? "Entrar en la liga" : `Sí, soy ${club.owner}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
