"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TIERS } from "@/lib/contracts";
import type { TierName } from "@/lib/players";

/** Guarda el sueldo por temporada de un nivel (en % de su precio). */
export async function setContractSalaryAction(leagueId: string, tier: string, percent: number): Promise<number> {
  if (!TIERS.includes(tier as TierName)) throw new Error("Nivel no válido.");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("El sueldo debe estar entre 0 y 100 %.");
  const value = Math.round(percent * 100) / 100;
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("contract_salaries")
    .upsert({ league_id: leagueId, tier, percent: value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`No se pudo guardar el sueldo: ${error.message}`);

  try {
    revalidatePath("/finances", "page");
    revalidatePath("/players", "layout");
  } catch {}
  return value;
}
