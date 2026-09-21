import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateMemCache } from "@/lib/data/cache";
import { invalidatePlayersCache } from "@/lib/data/league";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tag = body?.tag as string | undefined;
    const path = body?.path as string | undefined;

    // 1. Limpiar toda la caché en memoria del servidor
    invalidateMemCache(tag);
    invalidatePlayersCache();

    // 2. Invalidar tags de Next.js
    const tagsToInvalidate = tag
      ? [tag]
      : ["teams", "standings", "players", "matches", "league"];

    for (const t of tagsToInvalidate) {
      try {
        revalidateTag(t, "max");
      } catch {}
    }

    // 3. Invalidar rutas de Next.js
    const pathsToInvalidate = path
      ? [path]
      : [
          "/league",
          "/finances",
          "/teams",
          "/standings",
          "/calendar",
          "/market",
          "/players",
        ];

    for (const p of pathsToInvalidate) {
      try {
        revalidatePath(p, "page");
      } catch {}
    }

    return NextResponse.json({ success: true, invalidated: { tags: tagsToInvalidate, paths: pathsToInvalidate } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error durante la revalidación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
