import { createStaticClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { dataImageResponse } from "@/lib/data-image";

/** Sirve el escudo de un club como imagen normal, con caché larga (la dirección cambia si cambia el escudo). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return new Response(null, { status: 404 });
  const { data } = await createStaticClient().from("teams").select("logo_url").eq("id", id).maybeSingle();
  return dataImageResponse(data?.logo_url);
}
