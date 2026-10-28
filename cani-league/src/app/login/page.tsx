import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { getPrimaryLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar · Cani League" };

async function getSeason() {
  if (!isSupabaseConfigured()) return null;
  try {
    return (await getPrimaryLeague())?.season ?? null;
  } catch {
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [{ next, error }, season] = await Promise.all([searchParams, getSeason()]);
  // Solo rutas internas: nada de redirigir a otra web.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/calendar";
  return (
    <LoginScreen
      season={season}
      next={safeNext}
      initialError={error === "enlace" ? "El enlace ha caducado o ya se usó. Pide un código nuevo." : null}
    />
  );
}
