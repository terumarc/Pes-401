export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { SegmentedNav, TABLE_SECTIONS } from "@/components/layout/SegmentedNav";
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
    <div className="animate-fade-up pb-12">
      <PageHeader title="Tabla" />
      <SegmentedNav label="Secciones de la tabla" items={TABLE_SECTIONS} current="/trophies" />
      {result.ok ? (
        <TrophyRoom
          leagueId={league.id}
          initialCabinets={result.cabinets}
          initialPrizes={result.prizes}
        />
      ) : (
        <div className="rounded-[22px] bg-card p-4 text-[15px] text-muted-foreground">
          {result.reason === "missing_table"
            ? "Falta crear las tablas de trofeos en Supabase (migración 004_trophies.sql)."
            : `No se pudo cargar la sala de trofeos: ${result.message}`}
        </div>
      )}
    </div>
  );
}
