"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import localFont from "next/font/local";
import { OTPInput, type SlotProps } from "input-otp";
import { ChevronLeft, CircleAlert, Loader2, Mail } from "lucide-react";
import { PixelTrophy } from "@/components/trophies/PixelTrophy";
import { sendCodeAction, verifyCodeAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";

// Silkscreen (SIL OFL), servida desde el propio proyecto.
const pixel = localFont({ src: "../../fonts/silkscreen-400.woff2", weight: "400", display: "swap" });

const RESEND_SECONDS = 60;

type Step = "email" | "code" | "done";

/**
 * Pantalla de entrada: el trofeo de la liga girando en el círculo central,
 * bajo un foco de estadio. Dos pasos: email → código de 6 cifras.
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
    <main className="relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-[#0a0907] px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-white">
      <StadiumBackdrop />

      <div className="relative z-10 flex w-full max-w-[24rem] flex-1 flex-col">
        {/* Escenario: el trofeo sobre el círculo central, bajo el foco */}
        <section aria-labelledby="login-title" className="flex flex-1 flex-col items-center justify-center pb-6 pt-[4vh]">
          <div className="login-rise relative flex flex-col items-center" style={{ animationDelay: "80ms" }}>
            <PixelTrophy
              type="league"
              className="relative z-10 w-[8.25rem] drop-shadow-[0_22px_28px_rgba(232,179,65,0.32)]"
              title="Trofeo de la Cani League"
            />
            {/* Círculo central del campo visto en perspectiva, con la luz del foco en el suelo */}
            <svg aria-hidden viewBox="0 0 320 80" className="-mt-7 w-[17.5rem] overflow-visible">
              <defs>
                <radialGradient id="pool" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#e8b341" stopOpacity="0.38" />
                  <stop offset="55%" stopColor="#e8b341" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#e8b341" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="160" cy="40" rx="150" ry="34" fill="url(#pool)" />
              <ellipse cx="160" cy="40" rx="118" ry="24" fill="none" stroke="#f5efe1" strokeOpacity="0.28" strokeWidth="1.2" />
              <line x1="-400" y1="40" x2="720" y2="40" stroke="#f5efe1" strokeOpacity="0.16" strokeWidth="1.2" />
              <ellipse cx="160" cy="40" rx="3.5" ry="1.6" fill="#f5efe1" fillOpacity="0.6" />
            </svg>
          </div>

          <p
            className={cn(
              pixel.className,
              "login-rise mt-6 rounded-[4px] border border-[#e8b341]/35 bg-[#e8b341]/[0.07] px-2.5 py-1 text-[10px] tracking-[0.2em] text-[#f0c35a]",
            )}
            style={{ animationDelay: "200ms" }}
          >
            {season ? `TEMPORADA ${season}` : "PRO EVOLUTION SOCCER 6"}
          </p>
          <h1
            id="login-title"
            className="login-rise mt-3 text-center text-[52px] leading-[0.95] font-extrabold tracking-[-0.045em] text-[#fbf7ee] [text-shadow:0_2px_24px_rgba(232,179,65,0.18)]"
            style={{ animationDelay: "260ms" }}
          >
            Cani League
          </h1>
          <p className="login-rise mt-2.5 text-center text-[15px] text-[#a39d91] [text-wrap:balance]" style={{ animationDelay: "320ms" }}>
            La liga de PES 6 de los amigos.
          </p>
        </section>

        {/* Panel de entrada */}
        <section
          aria-label="Entrar"
          className="login-rise rounded-[28px] bg-[linear-gradient(180deg,rgba(255,250,240,0.075),rgba(255,250,240,0.035))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(255,255,255,0.06),0_30px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          style={{ animationDelay: "400ms" }}
        >
          {step === "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestCode();
              }}
              className="flex flex-col gap-3"
              noValidate
            >
              <div>
                <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Entra en la liga</h2>
                <label htmlFor="login-email" className="mt-1 block text-[14px] leading-snug text-[#a39d91]">
                  Escribe tu email y te mandamos un código de 6 cifras.
                </label>
              </div>
              <div className="relative mt-1">
                <Mail aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-[#7d776c]" />
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
                  className={cn(
                    "h-[54px] w-full rounded-[16px] bg-black/40 pr-4 pl-11 text-[17px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-200 outline-none placeholder:text-[#5f5a52]",
                    "focus-visible:shadow-[inset_0_0_0_1px_rgba(232,179,65,0.7),0_0_0_4px_rgba(232,179,65,0.12)]",
                    error && "shadow-[inset_0_0_0_1px_rgba(255,69,58,0.6)]",
                  )}
                />
              </div>
              <PrimaryButton pending={pending} disabled={!email.trim()}>
                {pending ? "Enviando código…" : "Recibir código"}
              </PrimaryButton>
            </form>
          )}

          {step !== "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Revisa tu correo</h2>
                <p className="mt-1 text-[14px] leading-snug text-[#a39d91]">
                  Hemos mandado el código a <span className="font-medium break-all text-[#fbf7ee]">{email}</span>. Puede tardar un minuto; mira también en spam.
                </p>
              </div>
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
                containerClassName="mt-1 flex w-full items-center justify-between gap-1.5 has-disabled:opacity-60"
                render={({ slots }) => (
                  <>
                    {slots.slice(0, 3).map((slot, i) => (
                      <CodeSlot key={i} {...slot} invalid={!!error} pixelClass={pixel.className} />
                    ))}
                    <span aria-hidden className="h-[2px] w-2.5 shrink-0 rounded-full bg-[#5f5a52]" />
                    {slots.slice(3).map((slot, i) => (
                      <CodeSlot key={i + 3} {...slot} invalid={!!error} pixelClass={pixel.className} />
                    ))}
                  </>
                )}
              />
              <PrimaryButton pending={pending || step === "done"} disabled={code.length < 6}>
                {step === "done" ? "Entrando…" : pending ? "Comprobando…" : "Entrar"}
              </PrimaryButton>
              <div className="-mx-1 -mb-2 flex items-center justify-between text-[15px]">
                <button
                  type="button"
                  onClick={backToEmail}
                  className="flex h-11 items-center gap-0.5 rounded-full px-1 text-[#f0c35a] transition-opacity hover:opacity-80 active:opacity-50 focus-visible:outline-2 focus-visible:outline-[#e8b341]"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                  Cambiar email
                </button>
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={cooldown > 0 || pending}
                  className="h-11 rounded-full px-2 text-[#f0c35a] tabular-nums transition-opacity hover:opacity-80 active:opacity-50 disabled:text-[#5f5a52] focus-visible:outline-2 focus-visible:outline-[#e8b341]"
                >
                  {cooldown > 0 ? `Reenviar en ${cooldown} s` : "Reenviar código"}
                </button>
              </div>
            </form>
          )}

          <p
            id="login-error"
            role="alert"
            aria-live="polite"
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300",
              error ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <span className="flex min-h-0 items-start gap-2 overflow-hidden text-[14px] leading-snug text-[#ff6b61]">
              <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
              {error}
            </span>
          </p>
        </section>

        <p className="login-rise mt-4 text-center text-[12px] leading-snug text-[#6b665c] [text-wrap:balance]" style={{ animationDelay: "480ms" }}>
          Solo entran los amigos que un admin ha añadido a la liga.
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
      className={cn(
        "mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition-[background-color,color,transform,box-shadow] duration-200",
        "bg-[#fbf7ee] text-[#14110c] shadow-[0_8px_24px_-8px_rgba(232,179,65,0.45)] hover:bg-white active:scale-[0.985]",
        "disabled:bg-white/[0.08] disabled:text-white/35 disabled:shadow-none disabled:active:scale-100",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b341]",
      )}
    >
      {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Casilla del código: dígitos en pixel dorado, como el marcador de un partido de PES. */
function CodeSlot({ char, isActive, hasFakeCaret, invalid, pixelClass }: SlotProps & { invalid: boolean; pixelClass: string }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/5] max-h-[64px] min-w-0 flex-1 items-center justify-center rounded-[14px] bg-black/40 text-[24px] text-[#f0c35a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-200",
        pixelClass,
        char && "[text-shadow:0_0_12px_rgba(232,179,65,0.5)]",
        isActive && "shadow-[inset_0_0_0_1px_rgba(232,179,65,0.8),0_0_0_4px_rgba(232,179,65,0.12)]",
        invalid && !isActive && "shadow-[inset_0_0_0_1px_rgba(255,69,58,0.55)]",
      )}
    >
      {char}
      {hasFakeCaret && <span aria-hidden className="absolute h-6 w-[3px] animate-pulse rounded-full bg-[#e8b341]" />}
    </div>
  );
}

/**
 * Estadio de noche: césped segado a rayas que se pierde en la oscuridad,
 * un foco cálido desde arriba y grano de película por encima.
 */
function StadiumBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="login-grass absolute inset-x-0 bottom-0 h-[78%]" />
      <div className="login-beam absolute top-[-10%] left-1/2 h-[85%] w-[min(140vw,980px)]" />
      <div className="login-grain absolute inset-0" />
    </div>
  );
}
