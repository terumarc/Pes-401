import { createStaticClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { dataImageResponse } from "@/lib/data-image";

/** Sirve la foto de un jugador como imagen normal, con caché larga (la dirección cambia si cambia la foto). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return new Response(null, { status: 404 });
  const { data } = await createStaticClient().from("players").select("photo_url").eq("id", id).maybeSingle();
  return dataImageResponse(data?.photo_url);
}
