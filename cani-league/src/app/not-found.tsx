import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center animate-fade-up">
      <p className="text-6xl font-semibold tracking-tight text-primary tabular-nums">404</p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Esta página no existe</h1>
      <p className="mt-2 text-pretty text-sm text-muted-foreground">
        Puede que el enlace esté mal escrito o que el equipo o jugador se haya borrado.
      </p>
      <Button asChild className="mt-6">
        <Link href="/league">Ir al inicio</Link>
      </Button>
    </div>
  );
}
