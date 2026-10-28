import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo menos los ficheros estáticos, los iconos, los trofeos y los escudos.
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|manifest.webmanifest|icons/|trophies/|api/logo/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
