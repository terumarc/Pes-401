"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OTPInput, type SlotProps } from "input-otp";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { CaniLeagueCrest } from "@/components/brand/CaniLeagueCrest";
import { sendCodeAction, verifyCodeAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const RESEND_SECONDS = 60;
const OFFLINE = "No hay conexión. Revisa tu internet y vuelve a intentarlo.";

type Step = "email" | "code" | "done";

/**
 * Pantalla de entrada, con el mismo estilo que el resto de la app: el trofeo
 * de la liga y una tarjeta. Dos pasos: email → código de 6 cifras.
 */
export function LoginScreen({
  season,
  next,
  initialError,
  invite = null,
}: {
  season: string | null;
  next: string;
  initialError: string | null;
  /** Código del enlace de invitación (/unirse/…): con él, un email nuevo entra en la liga. */
  invite?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function requestCode() {
    if (pending || !email.trim()) return;
    const resend = step === "code";
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await sendCodeAction(email, invite);
        if (!res.ok) {
          setError(res.error);
          if (!resend) requestAnimationFrame(() => emailRef.current?.focus());
          return;
        }
        setCode("");
        setStep("code");
        setCooldown(RESEND_SECONDS);
        if (resend) {
          setNotice("Te hemos mandado un código nuevo.");
          requestAnimationFrame(() => codeRef.current?.focus());
        }
      } catch {
        setError(OFFLINE);
      }
    });
  }

  function verify(value = code) {
    if (value.length < 6 || pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await verifyCodeAction(email, value);
        if (!res.ok) {
          setError(res.error);
          setCode("");
          requestAnimationFrame(() => codeRef.current?.focus());
          return;
        }
        setStep("done");
        router.replace(res.welcome ? `/bienvenida?next=${encodeURIComponent(next)}` : next);
        router.refresh();
      } catch {
        setError(OFFLINE);
        requestAnimationFrame(() => codeRef.current?.focus());
      }
    });
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setNotice(null);
    requestAnimationFrame(() => emailRef.current?.focus());
  }

  const busy = pending || step === "done";

  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground">
      {/* Escudo, nombre y tarjeta van juntos y centrados; la nota queda abajo. */}
      <div className="flex w-full max-w-md flex-1 flex-col justify-center animate-fade-up">
        <header className="flex flex-col items-center text-center">
          {/* Escudo de la liga con un brillo dorado detrás */}
          <div className="relative flex w-full justify-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -inset-y-8"
              style={{ background: "radial-gradient(closest-side, rgba(245,190,70,0.16), rgba(245,190,70,0.05) 55%, transparent)" }}
            />
            <CaniLeagueCrest className="relative h-[136px] w-auto drop-shadow-[0_6px_0_rgba(0,0,0,0.35)]" />
          </div>
          <h1 className="mt-5 text-[length:min(2rem,51px)] leading-[1.1] font-bold tracking-[-0.02em]">Cani League</h1>
          <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
            {season ? `Temporada ${season}` : "La liga de PES 6 de los amigos"}
          </p>
        </header>

        <section aria-labelledby="login-step-title" className="mt-8 rounded-[22px] bg-card p-5">
          {step === "email" ? (
            <form
              key="email"
              onSubmit={(e) => {
                e.preventDefault();
                requestCode();
              }}
              noValidate
              className="animate-fade-up"
            >
              <h2 id="login-step-title" className="text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
                {invite ? "Únete a la liga" : "Entrar"}
              </h2>
              <label htmlFor="login-email" className="mt-1 block text-[length:min(0.8824rem,22.5px)] text-muted-foreground [text-wrap:pretty]">
                {invite
                  ? "Te han invitado a la Cani League. Escribe tu email y te mandamos un código de 6 cifras."
                  : "Escribe tu email y te mandamos un código de 6 cifras."}
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                required
                placeholder="tu@email.com"
                value={email}
                disabled={pending}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={cn(
                  "mt-4 h-11 w-full rounded-[10px] bg-input px-3 text-[length:min(1rem,25.5px)] text-foreground caret-[#0a84ff] outline-none transition-shadow",
                  "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-60",
                  "aria-invalid:ring-2 aria-invalid:ring-destructive",
                  // El autorrelleno del navegador no pinta el campo de amarillo o azul.
                  "autofill:shadow-[inset_0_0_0_100px_#2c2c2e] autofill:[-webkit-text-fill-color:#fff]",
                )}
              />
              <Feedback error={error} notice={null} />
              <PrimaryButton pending={pending} disabled={!email.trim()}>
                {pending ? "Enviando código…" : "Recibir código"}
              </PrimaryButton>
            </form>
          ) : (
            <form
              key="code"
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
              className="animate-fade-up"
            >
              <h2 id="login-step-title" className="text-[length:min(1.1765rem,30px)] font-bold tracking-tight">
                Revisa tu correo
              </h2>
              <p className="mt-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground [text-wrap:pretty]">
                Hemos mandado el código a <span className="break-all text-foreground">{email.trim()}</span>. Si no llega en
                un minuto, mira en spam.
              </p>
              <OTPInput
                ref={codeRef}
                maxLength={6}
                value={code}
                onChange={(v) => {
                  setCode(v.replace(/\D/g, ""));
                  if (error) setError(null);
                  if (notice) setNotice(null);
                }}
                onComplete={(v: string) => verify(v)}
                inputMode="numeric"
                pattern="^\d*$"
                autoComplete="one-time-code"
                autoFocus
                disabled={busy}
                aria-label="Código de 6 cifras"
                aria-invalid={!!error || undefined}
                aria-describedby={error ? "login-error" : undefined}
                containerClassName="mt-4 flex w-full items-center gap-2 has-disabled:opacity-60"
                render={({ slots }) => (
                  <>
                    {slots.map((slot, i) => (
                      <CodeSlot key={i} {...slot} />
                    ))}
                  </>
                )}
              />
              <Feedback error={error} notice={notice} />
              <PrimaryButton pending={busy} disabled={code.length < 6}>
                {step === "done" ? "Entrando…" : pending ? "Comprobando…" : "Entrar"}
              </PrimaryButton>
              <div className="-mx-1 mt-2 -mb-2 flex items-center justify-between gap-2 text-[length:min(1rem,25.5px)]">
                <button
                  type="button"
                  onClick={backToEmail}
                  disabled={busy}
                  className="flex h-11 items-center gap-0.5 rounded-[10px] px-1 text-[#0a84ff] outline-none active:opacity-50 disabled:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                  Cambiar email
                </button>
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={cooldown > 0 || busy}
                  aria-label={cooldown > 0 ? `Reenviar código en ${cooldown} segundos` : "Reenviar código"}
                  className="h-11 rounded-[10px] px-1 text-[#0a84ff] tabular-nums outline-none active:opacity-50 disabled:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {cooldown > 0 ? `Reenviar en ${cooldown} s` : "Reenviar código"}
                </button>
              </div>
            </form>
          )}

        </section>
      </div>

      <p className="mt-6 max-w-xs text-center text-[length:min(0.7647rem,19.5px)] text-muted-foreground [text-wrap:balance]">
        {invite
          ? "Después eliges tu nombre y tu club."
          : "Para entrar por primera vez, usa el enlace de invitación del grupo."}
      </p>
    </main>
  );
}

/** Error o aviso justo debajo del campo, donde se está mirando. */
function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <div aria-live="polite">
      {error ? (
        <p id="login-error" role="alert" className="mt-2.5 text-[length:min(0.8824rem,22.5px)] text-destructive [text-wrap:pretty]">
          {error}
        </p>
      ) : notice ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-[length:min(0.8824rem,22.5px)] text-[#30d158]">
          <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          {notice}
        </p>
      ) : null}
    </div>
  );
}

/** Botón principal de la app: cápsula blanca, como en las hojas de ofertas y partidos. */
function PrimaryButton({ pending, disabled, children }: { pending: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-white text-[length:min(1rem,25.5px)] font-semibold text-black outline-none transition-opacity active:opacity-80 disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/60"
    >
      {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Casilla del código, como los campos del resto de la app. */
function CodeSlot({ char, isActive, hasFakeCaret }: SlotProps) {
  return (
    <div
      className={cn(
        "relative flex h-[52px] min-w-0 flex-1 items-center justify-center rounded-[10px] bg-input text-[length:min(1.4118rem,36px)] font-semibold tabular-nums transition-shadow",
        isActive && "ring-2 ring-ring/60",
      )}
    >
      {char}
      {hasFakeCaret && <span aria-hidden className="absolute h-6 w-[2px] animate-pulse rounded-full bg-[#0a84ff]" />}
    </div>
  );
}
