"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center animate-fade-up">
      <h1 className="text-xl font-semibold tracking-tight">No se pudo cargar esta pantalla</h1>
      <p className="mt-2 text-pretty text-sm text-muted-foreground">
        Falló la conexión con la base de datos o algo no respondió a tiempo. Vuelve a intentarlo;
        si sigue fallando, recarga la página.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => retry()}>Reintentar</Button>
        <Button asChild variant="outline">
          <Link href="/league">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
