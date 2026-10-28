import { createStaticClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Sirve el escudo de un club como imagen normal, con caché larga (la dirección cambia si cambia el escudo). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return new Response(null, { status: 404 });
  const { data } = await createStaticClient().from("teams").select("logo_url").eq("id", id).maybeSingle();
  const url = data?.logo_url;
  if (!url) return new Response(null, { status: 404 });

  const m = url.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!m) {
    if (/^https?:\/\//i.test(url)) return Response.redirect(url, 302);
    return new Response(null, { status: 404 });
  }
  const [, type, b64, payload] = m;
  const body = b64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
