"use client";

import { useState } from "react";
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
        <Button>Editar equipo</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar equipo</DialogTitle>
        </DialogHeader>
        <TeamForm team={team} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
