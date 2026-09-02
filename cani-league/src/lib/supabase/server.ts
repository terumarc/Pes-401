import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy‑load `cookies` only on the server. Importing from "next/headers" at the top level
// causes the module to be included in client bundles, which Turbopack rejects.
// We import it dynamically inside the function where it is used.
async function getCookies() {
  const { cookies } = await import("next/headers");
  return cookies();
}
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await getCookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — safe to ignore when middleware refreshes sessions.
        }
      },
    },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let staticClientInstance: SupabaseClient<Database> | null = null;

export function createStaticClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  if (!staticClientInstance) {
    staticClientInstance = createSupabaseClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return staticClientInstance;
}
