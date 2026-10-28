/** Convierte una imagen incrustada (data:…) en una respuesta de imagen normal con caché larga. */
export function dataImageResponse(url: string | null | undefined): Response {
  if (!url) return new Response(null, { status: 404 });
  const m = url.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!m) {
    if (/^https?:\/\//i.test(url)) return Response.redirect(url, 302);
    return new Response(null, { status: 404 });
  }
  const [, type, b64, payload] = m;
  const body = b64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
  return new Response(body, {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
