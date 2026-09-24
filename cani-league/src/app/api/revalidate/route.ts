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
    invalidateMemCache();
    invalidatePlayersCache();

    // 2. Invalidar tags de Next.js
    let tagsToInvalidate: string[];
    if (tag === "teams") {
      tagsToInvalidate = ["teams", "standings", "dashboard", "league", "matches"];
    } else if (tag) {
      tagsToInvalidate = [tag];
    } else {
      tagsToInvalidate = ["teams", "standings", "players", "matches", "league", "dashboard"];
    }

    for (const t of tagsToInvalidate) {
      try {
        revalidateTag(t, "max");
      } catch {}
    }

    // 3. Invalidar layouts y rutas de Next.js
    try {
      revalidatePath("/", "layout");
      revalidatePath("/teams", "layout");
      revalidatePath("/teams", "page");
      revalidatePath("/dashboard", "page");
      revalidatePath("/league", "page");
      revalidatePath("/finances", "page");
      revalidatePath("/standings", "page");
      revalidatePath("/calendar", "page");
      revalidatePath("/market", "page");
      revalidatePath("/players", "page");
      if (path) {
        revalidatePath(path, "page");
        revalidatePath(path, "layout");
      }
    } catch {}

    return NextResponse.json({
      success: true,
      invalidated: { tags: tagsToInvalidate },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error durante la revalidación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
