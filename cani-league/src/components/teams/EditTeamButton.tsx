"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { TeamForm } from "@/components/teams/TeamForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Team } from "@/types";

export function EditTeamButton({ team }: { team: Team }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-1.5 font-display font-semibold border-white/[0.12] bg-card/60 backdrop-blur-md hover:bg-card hover:border-white/[0.25] shadow-xs cursor-pointer transition-all"
        >
          <Pencil className="size-3.5 text-muted-foreground" />
          <span>Editar Club</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg border-white/[0.1] bg-card/95 backdrop-blur-xl shadow-2xl p-6">
        <DialogHeader className="border-b border-white/[0.08] pb-4">
          <DialogTitle className="font-display text-xl font-bold tracking-tight text-foreground uppercase">
            Editar Información del Club
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Personaliza el nombre, colores oficiales, escudo y presupuesto de {team.name}
          </p>
        </DialogHeader>
        <TeamForm team={team} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
