"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OTPInput, type SlotProps } from "input-otp";
import { ChevronLeft, Loader2 } from "lucide-react";
import { PixelTrophy } from "@/components/trophies/PixelTrophy";
import { sendCodeAction, verifyCodeAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const RESEND_SECONDS = 60;

type Step = "email" | "code" | "done";

/**
 * Pantalla de entrada, con el mismo estilo que el resto de la app: el trofeo
 * de la liga y una tarjeta. Dos pasos: email → código de 6 cifras.
 */
export function LoginScreen({
  season,
  next,
  initialError,
}: {
  season: string | null;
  next: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function requestCode() {
    setError(null);
    startTransition(async () => {
      const res = await sendCodeAction(email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCode("");
      setStep("code");
      setCooldown(RESEND_SECONDS);
    });
  }

  function verify(value = code) {
    if (value.length < 6 || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await verifyCodeAction(email, value);
      if (!res.ok) {
        setError(res.error);
        setCode("");
        return;
      }
      setStep("done");
      router.replace(next);
      router.refresh();
    });
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    setError(null);
    requestAnimationFrame(() => emailRef.current?.focus());
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] text-foreground">
      <div className="flex w-full max-w-md flex-1 flex-col">
        {/* El trofeo de la liga en su estante iluminado, como en la sala de trofeos */}
        <section aria-labelledby="login-title" className="flex flex-1 flex-col items-center justify-center pb-8 pt-6 text-center">
          <div className="relative flex h-44 w-48 items-end justify-center animate-fade-up">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-10 -top-4 -bottom-16"
              style={{ background: "radial-gradient(45% 50% at 50% 62%, rgba(245,190,70,0.22), transparent 70%)" }}
            />
            <PixelTrophy
              type="league"
              title="Trofeo de la Cani League"
              className="relative h-40 drop-shadow-[0_6px_0_rgba(0,0,0,0.35)]"
            />
          </div>
          <h1 id="login-title" className="mt-6 text-[34px] leading-[1.1] font-bold tracking-[-0.02em] animate-fade-up" style={{ animationDelay: "60ms" }}>
            Cani League
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground animate-fade-up" style={{ animationDelay: "100ms" }}>
            {season ? `Temporada ${season}` : "La liga de PES 6 de los amigos"}
          </p>
        </section>

        <section aria-label="Entrar" className="rounded-[22px] bg-card p-5 animate-fade-up" style={{ animationDelay: "140ms" }}>
          {step === "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestCode();
              }}
              noValidate
            >
              <h2 className="text-[20px] font-bold tracking-tight">Entrar</h2>
              <label htmlFor="login-email" className="mt-1 block text-[15px] text-muted-foreground [text-wrap:pretty]">
                Escribe tu email y te mandamos un código de 6 cifras.
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="mt-4 h-11 w-full rounded-[10px] bg-input px-3 text-[17px] outline-none placeholder:text-[#636366] focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:ring-2 aria-invalid:ring-destructive"
              />
              <PrimaryButton pending={pending} disabled={!email.trim()}>
                {pending ? "Enviando…" : "Recibir código"}
              </PrimaryButton>
            </form>
          )}

          {step !== "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
            >
              <h2 className="text-[20px] font-bold tracking-tight">Revisa tu correo</h2>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Hemos mandado el código a <span className="break-all text-foreground">{email}</span>. Si no llega, mira en spam.
              </p>
              <OTPInput
                maxLength={6}
                value={code}
                onChange={(v) => {
                  setCode(v.replace(/\D/g, ""));
                  if (error) setError(null);
                }}
                onComplete={(v: string) => verify(v)}
                inputMode="numeric"
                pattern="^\d*$"
                autoComplete="one-time-code"
                autoFocus
                disabled={pending || step === "done"}
                aria-label="Código de 6 cifras"
                aria-invalid={!!error}
                containerClassName="mt-4 flex w-full items-center gap-2 has-disabled:opacity-60"
                render={({ slots }) => (
                  <>
                    {slots.map((slot, i) => (
                      <CodeSlot key={i} {...slot} invalid={!!error} />
                    ))}
                  </>
                )}
              />
              <PrimaryButton pending={pending || step === "done"} disabled={code.length < 6}>
                {step === "done" ? "Entrando…" : pending ? "Comprobando…" : "Entrar"}
              </PrimaryButton>
              <div className="-mx-1 mt-2 -mb-2 flex items-center justify-between text-[17px]">
                <button
                  type="button"
                  onClick={backToEmail}
                  className="flex h-11 items-center gap-0.5 px-1 text-[#0a84ff] active:opacity-50"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                  Cambiar email
                </button>
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={cooldown > 0 || pending}
                  className="h-11 px-1 text-[#0a84ff] tabular-nums active:opacity-50 disabled:text-muted-foreground"
                >
                  {cooldown > 0 ? `Reenviar (${cooldown} s)` : "Reenviar"}
                </button>
              </div>
            </form>
          )}

          {error && (
            <p id="login-error" role="alert" className="mt-3 text-[15px] text-destructive">
              {error}
            </p>
          )}
        </section>

        <p className="mt-3 px-4 text-center text-[13px] text-muted-foreground [text-wrap:balance]">
          Solo pueden entrar los amigos que un admin ha añadido a la liga.
        </p>
      </div>
    </main>
  );
}

function PrimaryButton({ pending, disabled, children }: { pending: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black active:opacity-80 disabled:opacity-40"
    >
      {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Casilla del código, como los campos del resto de la app. */
function CodeSlot({ char, isActive, hasFakeCaret, invalid }: SlotProps & { invalid: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-[52px] min-w-0 flex-1 items-center justify-center rounded-[10px] bg-input text-[24px] font-semibold tabular-nums",
        isActive && "ring-2 ring-ring/60",
        invalid && !isActive && "ring-2 ring-destructive",
      )}
    >
      {char}
      {hasFakeCaret && <span aria-hidden className="absolute h-6 w-[2px] animate-pulse bg-[#0a84ff]" />}
    </div>
  );
}
