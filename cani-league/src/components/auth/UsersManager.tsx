"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/use-confirm";
import { addMemberAction, removeMemberAction, updateMemberAction, type MemberInput } from "@/app/actions/members";
import { initials } from "@/components/auth/UserMenu";
import { cn } from "@/lib/utils";

export type MemberView = {
  id: string;
  email: string;
  name: string;
  teamId: string | null;
  isAdmin: boolean;
  /** Ya ha entrado alguna vez. */
  joined: boolean;
  lastSeen: string | null;
};

type Club = { id: string; name: string };

/** Lista de la liga: quién puede entrar, con qué club y quién es admin. */
export function UsersManager({ members, clubs, meId }: { members: MemberView[]; clubs: Club[]; meId: string }) {
  const [editing, setEditing] = useState<MemberView | "new" | null>(null);
  const clubName = (id: string | null) => clubs.find((c) => c.id === id)?.name ?? null;
  const takenClubs = new Map(members.filter((m) => m.teamId).map((m) => [m.teamId!, m.name]));
  const clubsWithoutOwner = clubs.filter((c) => !takenClubs.has(c.id));

  return (
    <div className="space-y-6">
      <p className="px-1 text-[15px] text-muted-foreground">
        Solo pueden entrar los emails de esta lista. Cada uno gestiona su club; los admins pueden hacer de todo y actuar por
        cualquier club.
      </p>

      <ul className="overflow-hidden rounded-[22px] bg-card">
        {members.map((m) => (
          <li key={m.id} className="group">
            <button
              type="button"
              onClick={() => setEditing(m)}
              className="flex min-h-[68px] w-full items-center gap-3 pl-4 text-left active:bg-white/[0.06]"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2c2c2e] text-[15px] font-semibold"
              >
                {initials(m.name) || "?"}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border py-2.5 pr-3 group-last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[17px]">{m.name}</span>
                    {m.id === meId && <span className="shrink-0 text-[13px] text-muted-foreground">(tú)</span>}
                    {m.isAdmin && (
                      <span className="shrink-0 rounded-full bg-[#ff9f0a]/15 px-2 py-0.5 text-[11px] font-semibold text-[#ff9f0a]">
                        Admin
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">
                    {clubName(m.teamId) ?? "Sin club"} · {m.email}
                  </span>
                  {!m.joined && <span className="block text-[13px] text-[#0a84ff]">Aún no ha entrado</span>}
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#5a5a5f]" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className="flex h-[50px] w-full items-center justify-center gap-1.5 rounded-full bg-white text-[17px] font-semibold text-black active:opacity-80"
      >
        <Plus className="size-5" strokeWidth={2.4} aria-hidden />
        Añadir persona
      </button>

      {clubsWithoutOwner.length > 0 && (
        <p className="px-1 text-[13px] text-muted-foreground">
          Clubes sin nadie asignado: {clubsWithoutOwner.map((c) => c.name).join(", ")}.
        </p>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null && (
          <MemberSheet
            key={editing === "new" ? "new" : editing.id}
            member={editing === "new" ? null : editing}
            clubs={clubs}
            takenClubs={takenClubs}
            isMe={editing !== "new" && editing.id === meId}
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
  member: MemberView | null;
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
    email: member?.email ?? "",
    displayName: member?.name ?? "",
    teamId: member?.teamId ?? null,
    isAdmin: member?.isAdmin ?? false,
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const res = member ? await updateMemberAction(member.id, form) : await addMemberAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  async function remove() {
    if (!member) return;
    const ok = await confirm({
      title: `Quitar a ${member.name}`,
      description: "Ya no podrá entrar en la app. Sus movimientos se quedan en el historial.",
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
    "h-11 w-full rounded-[10px] bg-input px-3 text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60";
  const owner = form.teamId ? takenClubs.get(form.teamId) : undefined;
  const ownerIsOther = owner && owner !== member?.name;

  return (
    <DialogContent showCloseButton={false} className="gap-0 border-0 bg-card p-5 pt-2 sm:max-w-md">
      {confirmDialog}
      <span aria-hidden className="mx-auto mb-1 h-[5px] w-9 rounded-full bg-white/25 sm:hidden" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onClose} className="h-11 justify-self-start text-[17px] text-[#0a84ff] active:opacity-60">
          Cancelar
        </button>
        <DialogTitle className="text-[17px] font-semibold">{member ? "Editar" : "Nueva persona"}</DialogTitle>
        <button
          type="button"
          onClick={save}
          disabled={pending || !form.email.trim() || !form.displayName.trim()}
          className="h-11 justify-self-end text-[17px] font-semibold text-[#0a84ff] active:opacity-60 disabled:text-muted-foreground"
        >
          {pending ? "Guardando…" : member ? "Guardar" : "Añadir"}
        </button>
      </div>
      <DialogDescription className="sr-only">Nombre, email, club y permisos</DialogDescription>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] text-muted-foreground">Nombre</span>
          <input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="Cómo le llamáis"
            autoComplete="off"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] text-muted-foreground">Email</span>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="email@ejemplo.com"
            className={field}
          />
          {member?.joined && (
            <span className="mt-1.5 block px-1 text-[13px] text-muted-foreground">
              Ya ha entrado: su cuenta sigue funcionando aunque cambies el email aquí.
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] text-muted-foreground">Club</span>
          <select
            value={form.teamId ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value || null }))}
            className={field}
          >
            <option value="">Sin club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {takenClubs.has(c.id) && takenClubs.get(c.id) !== member?.name ? ` · ${takenClubs.get(c.id)}` : ""}
              </option>
            ))}
          </select>
          {ownerIsOther && (
            <span className="mt-1.5 block px-1 text-[13px] text-[#ff9f0a]">
              {owner} también lleva este club: los dos podrán gestionarlo.
            </span>
          )}
        </label>

        <div className="flex min-h-11 items-center justify-between gap-4 rounded-[10px] bg-input px-3 py-2">
          <span>
            <span className="block text-[17px]">Admin</span>
            <span className="block text-[13px] text-muted-foreground">
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

      {error && <p role="alert" className="mt-4 text-[15px] text-destructive">{error}</p>}

      {member && !isMe && (
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className={cn("mt-6 h-[50px] w-full rounded-full text-[17px] font-medium text-destructive active:bg-white/5 disabled:opacity-50")}
        >
          Quitar de la liga
        </button>
      )}
    </DialogContent>
  );
}
