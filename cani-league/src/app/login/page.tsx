export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { EntryScreen } from "@/components/auth/EntryScreen";
import { getEntryData } from "@/lib/data/entry";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar · Cani League" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Solo rutas internas: nada de redirigir a otra web.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/calendar";
  const { season, clubs } = isSupabaseConfigured() ? await getEntryData() : { season: null, clubs: [] };
  return <EntryScreen season={season} clubs={clubs} next={safeNext} invite={null} />;
}
