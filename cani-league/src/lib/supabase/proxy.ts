import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/** Rutas que se pueden abrir sin haber entrado. */
const PUBLIC_PATHS = ["/login", "/auth/"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

/**
 * Refresca la sesión (cookies) en cada petición y manda a /login a quien no
 * haya entrado. La comprobación de qué puede hacer cada uno va en el servidor.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims valida el token y lo renueva si hace falta. No meter nada entre
  // la creación del cliente y esta llamada.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && !isPublic(pathname)) {
    // Las llamadas a la API responden con error en vez de redirigir.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Tienes que entrar en la app para hacer esto." }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (signedIn && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/calendar";
    home.search = "";
    const redirect = NextResponse.redirect(home);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
