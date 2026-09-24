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
import { cn } from "@/lib/utils";
import type { Team } from "@/types";

type EditTeamButtonProps = {
  team: Team;
  variant?: "default" | "icon";
  className?: string;
};

export function EditTeamButton({
  team,
  variant = "default",
  className,
}: EditTeamButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "size-10 shrink-0 rounded-xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.1] hover:border-white/[0.25] text-muted-foreground hover:text-foreground shadow-xs cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary/40",
              className
            )}
            title={`Editar ${team.name}`}
            aria-label={`Editar información de ${team.name}`}
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className={cn(
              "gap-1.5 font-display font-semibold border-white/[0.12] bg-card/60 backdrop-blur-md hover:bg-card hover:border-white/[0.25] shadow-xs cursor-pointer transition-all",
              className
            )}
          >
            <Pencil className="size-3.5 text-muted-foreground" />
            <span>Editar Club</span>
          </Button>
        )}
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
