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
              "size-11 shrink-0",
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
              "gap-1.5",
              className
            )}
          >
            <Pencil className="size-4" />
            <span>Editar club</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-0 bg-card p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold">
            Editar club
          </DialogTitle>
        </DialogHeader>
        <TeamForm team={team} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
