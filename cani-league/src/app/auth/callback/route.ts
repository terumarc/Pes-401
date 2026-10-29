import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Enlace del correo: si alguien pulsa el enlace en vez de escribir el código. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })).error;
  }

  const target = url.clone();
  target.search = "";
  if (ok) {
    const { data: member } = await supabase.rpc("claim_membership");
    target.pathname = member && !member.onboarded_at ? "/bienvenida" : "/calendar";
  } else {
    target.pathname = "/login";
    target.searchParams.set("error", "enlace");
  }
  return NextResponse.redirect(target);
}
