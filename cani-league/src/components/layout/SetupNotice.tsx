import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export function SetupNotice() {
  const configured = isSupabaseConfigured();
  if (configured) return null;

  return (
    <Alert className="mb-8">
      <AlertTitle>Configura Supabase para continuar</AlertTitle>
      <AlertDescription>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>
            Copia <code className="rounded bg-muted px-1">.env.local.example</code>{" "}
            a <code className="rounded bg-muted px-1">.env.local</code>
          </li>
          <li>Añade URL y anon key de tu proyecto Supabase</li>
          <li>
            Ejecuta el schema y seed SQL, o usa el MCP de Supabase
          </li>
          <li>Reinicia el servidor de desarrollo</li>
        </ol>
      </AlertDescription>
    </Alert>
  );
}
