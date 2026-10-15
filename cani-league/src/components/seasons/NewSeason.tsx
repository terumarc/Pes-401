"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startNewSeasonAction } from "@/app/actions/seasons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Botón y hoja para cerrar la temporada actual y empezar la siguiente. */
export function NewSeason({ leagueId, current, suggested }: { leagueId: string; current: string; suggested: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(suggested);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await startNewSeasonAction(leagueId, label);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo empezar la temporada.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-full rounded-full bg-white text-[17px] font-semibold text-black active:opacity-80 sm:w-auto sm:px-6"
      >
        Cerrar temporada {current}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
          <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <button type="button" onClick={() => setOpen(false)} className="h-11 justify-self-start text-[17px] text-[#0a84ff]">
              Cancelar
            </button>
            <DialogTitle className="text-[17px] font-semibold">Nueva temporada</DialogTitle>
            <span />
          </div>
          <DialogDescription className="mt-3 text-[15px] text-muted-foreground">
            Se guarda la temporada {current} (clasificación, campeones y goleadores), el primero recibe el título de Liga
            con su premio, se cobran los sueldos pendientes y se genera el calendario nuevo. Los partidos de {current} se
            conservan en el historial.
          </DialogDescription>
          <label className="mt-5 block">
            <span className="mb-1.5 block px-1 text-[13px] text-muted-foreground">Nombre de la nueva temporada</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-11 w-full rounded-[10px] bg-input px-3 text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          </label>
          {error && <p className="mt-3 text-[15px] text-destructive">{error}</p>}
          <button
            type="button"
            onClick={confirm}
            disabled={pending || !label.trim()}
            className="mt-6 h-[50px] w-full rounded-full bg-white text-[17px] font-semibold text-black disabled:opacity-40"
          >
            {pending ? "Cerrando temporada…" : `Empezar ${label.trim() || "temporada"}`}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
