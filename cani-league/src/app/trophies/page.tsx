export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { TrophyRoom } from "@/components/trophies/TrophyRoom";
import { getPrimaryLeague } from "@/lib/data/league";
import { getTrophyCabinets } from "@/lib/data/trophies";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function TrophiesPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const league = await getPrimaryLeague();
  if (!league) {
    return <p className="text-ink-muted">No hay liga configurada.</p>;
  }

  const result = await getTrophyCabinets(league.id);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={league.name}
        title="Sala de trofeos"
        description="Liga, Champions, Copa de Liga y Conference: el palmarés de cada club."
      />
      {result.ok ? (
        <TrophyRoom
          leagueId={league.id}
          initialCabinets={result.cabinets}
          initialPrizes={result.prizes}
        />
      ) : (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          {result.reason === "missing_table"
            ? "Falta crear las tablas de trofeos en Supabase (migración 004_trophies.sql)."
            : `No se pudo cargar la sala de trofeos: ${result.message}`}
        </div>
      )}
    </div>
  );
}
