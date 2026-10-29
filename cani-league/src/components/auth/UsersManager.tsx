"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/use-confirm";
import { removeDevicesAction, removeMemberAction, updateMemberAction, type MemberInput } from "@/app/actions/members";
import { initials } from "@/components/auth/UserMenu";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/teams/TeamCard";

export type MemberView = {
  id: string;
  name: string;
  teamId: string | null;
  isAdmin: boolean;
  /** Móviles o navegadores con los que ha entrado. */
  devices: number;
  lastSeen: string | null;
};

type Club = { id: string; name: string; logoUrl: string | null; color: string };

/** Quién está en la liga, con qué club y quién es admin. Se entra con el enlace del grupo. */
export function UsersManager({ members, clubs, meId }: { members: MemberView[]; clubs: Club[]; meId: string }) {
  const [editing, setEditing] = useState<MemberView | null>(null);
  const clubOf = (id: string | null) => clubs.find((c) => c.id === id) ?? null;
  const takenClubs = new Map(members.filter((m) => m.teamId).map((m) => [m.teamId!, m.name]));
  const clubsWithoutOwner = clubs.filter((c) => !takenClubs.has(c.id));

  return (
    <div className="space-y-6">
      <p className="px-1 text-[length:min(0.8824rem,22.5px)] text-muted-foreground">
        Cada uno entra con el enlace y eligiendo su club. Los admins pueden hacer de todo y actuar por cualquier club. Toca a
        alguien para cambiarle el nombre o el club, hacerle admin o sacarle de la liga.
      </p>

      <ul className="overflow-hidden rounded-[22px] bg-card">
        {members.map((m) => {
          const club = clubOf(m.teamId);
          return (
          <li key={m.id} className="group">
            <button
              type="button"
              onClick={() => setEditing(m)}
              className="flex min-h-[68px] w-full items-center gap-3 pl-4 text-left active:bg-white/[0.06]"
            >
              <span aria-hidden className="shrink-0 large-text:self-start large-text:pt-3">
                {club ? (
                  <TeamLogo name={club.name} logoUrl={club.logoUrl} color={club.color} size="md" />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#2c2c2e] text-[15px] font-semibold">
                    {initials(m.name) || "?"}
                  </span>
                )}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border py-3 pr-3 group-last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[length:min(1rem,25.5px)] font-semibold">{m.name}</span>
                    {m.id === meId && <span className="shrink-0 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">(tú)</span>}
                    {m.isAdmin && (
                      <span className="shrink-0 rounded-full bg-[#ff9f0a]/15 px-2 py-0.5 text-[length:min(0.6471rem,16.5px)] font-semibold text-[#ff9f0a]">
                        Admin
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
                    {club?.name ?? "Sin club"}
                    {m.devices > 1 ? ` · ${m.devices} móviles` : ""}
                  </span>
                  {m.devices === 0 && (
                    <span className="block text-[length:min(0.7647rem,19.5px)] text-[#0a84ff]">Aún no ha entrado</span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#5a5a5f]" aria-hidden />
              </span>
            </button>
          </li>
          );
        })}
      </ul>

      {clubsWithoutOwner.length > 0 && (
        <p className="px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
          Clubes libres: {clubsWithoutOwner.map((c) => c.name).join(", ")}.
        </p>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <MemberSheet
            key={editing.id}
            member={editing}
            clubs={clubs}
            takenClubs={takenClubs}
            isMe={editing.id === meId}
            onClose={() => setEditing(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function MemberSheet({
  member,
  clubs,
  takenClubs,
  isMe,
  onClose,
}: {
  member: MemberView;
  clubs: Club[];
  takenClubs: Map<string, string>;
  isMe: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MemberInput>({
    displayName: member.name,
    teamId: member.teamId,
    isAdmin: member.isAdmin,
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateMemberAction(member.id, form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  async function signOutDevices() {
    const ok = await confirm({
      title: `Sacar los móviles de ${member.name}`,
      description: "Sus móviles dejan de estar dentro. Para volver, tendrá que abrir el enlace y elegir su club otra vez.",
      confirmLabel: "Sacar móviles",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await removeDevicesAction(member.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Quitar a ${member.name}`,
      description: "Sale de la liga y su club queda libre. Sus movimientos se quedan en el historial.",
      confirmLabel: "Quitar de la liga",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await removeMemberAction(member.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const field =
    "h-11 w-full rounded-[10px] bg-input px-3 text-[length:min(1rem,25.5px)] outline-none focus-visible:ring-2 focus-visible:ring-ring/60";
  const owner = form.teamId ? takenClubs.get(form.teamId) : undefined;
  const ownerIsOther = owner && owner !== member.name;

  return (
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      {confirmDialog}
      <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onClose} className="h-11 justify-self-start text-[length:min(1rem,25.5px)] text-[#0a84ff] active:opacity-60">
          Cancelar
        </button>
        <DialogTitle className="text-[length:min(1rem,25.5px)] font-semibold">Editar</DialogTitle>
        <button
          type="button"
          onClick={save}
          disabled={pending || !form.displayName.trim()}
          className="h-11 justify-self-end text-[length:min(1rem,25.5px)] font-semibold text-[#0a84ff] active:opacity-60 disabled:text-muted-foreground"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <DialogDescription className="sr-only">Nombre, club y permisos</DialogDescription>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Nombre</span>
          <input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="Cómo le llamáis"
            autoComplete="off"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">Club</span>
          <select
            value={form.teamId ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value || null }))}
            className={field}
          >
            <option value="">Sin club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {takenClubs.has(c.id) && takenClubs.get(c.id) !== member.name ? ` · ${takenClubs.get(c.id)}` : ""}
              </option>
            ))}
          </select>
          {ownerIsOther && (
            <span className="mt-1.5 block px-1 text-[length:min(0.7647rem,19.5px)] text-[#ff9f0a]">
              Este club ya es de {owner}. Cámbiale antes a {owner} de club.
            </span>
          )}
        </label>

        <div className="flex min-h-11 items-center justify-between gap-4 rounded-[10px] bg-input px-3 py-2">
          <span>
            <span className="block text-[length:min(1rem,25.5px)]">Admin</span>
            <span className="block text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
              Puede apuntar cualquier partido, tocar presupuestos y actuar por cualquier club.
            </span>
          </span>
          <Switch
            checked={form.isAdmin}
            onCheckedChange={(v) => setForm((f) => ({ ...f, isAdmin: v === true }))}
            aria-label="Admin"
          />
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-[length:min(0.8824rem,22.5px)] text-destructive">{error}</p>}

      {!isMe && (
        <div className="mt-6 space-y-1">
          {member.devices > 0 && (
            <button
              type="button"
              onClick={signOutDevices}
              disabled={pending}
              className="h-[50px] w-full rounded-full text-[length:min(1rem,25.5px)] font-medium text-[#0a84ff] active:bg-white/5 disabled:opacity-50"
            >
              Sacar sus móviles ({member.devices})
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={cn("h-[50px] w-full rounded-full text-[length:min(1rem,25.5px)] font-medium text-destructive active:bg-white/5 disabled:opacity-50")}
          >
            Quitar de la liga
          </button>
        </div>
      )}
    </DialogContent>
  );
}
