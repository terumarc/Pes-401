"use client";

import { useRouter } from "next/navigation";
import { PlayerForm } from "@/components/players/PlayerForm";
import { Card, CardContent } from "@/components/ui/card";
import type { Team } from "@/types";

type PlayersPageClientProps = {
  teams: Team[];
  showForm: boolean;
  defaultTeamId?: string;
};

export function PlayersPageClient({
  teams,
  showForm,
  defaultTeamId,
}: PlayersPageClientProps) {
  const router = useRouter();

  if (!showForm) return null;

  return (
    <Card className="mb-8">
      <CardContent>
        <PlayerForm
          teams={teams}
          defaultTeamId={defaultTeamId}
          onSaved={(id) => router.push(`/players/${id}`)}
        />
      </CardContent>
    </Card>
  );
}
