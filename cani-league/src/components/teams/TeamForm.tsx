"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTeamClient } from "@/lib/data/mutations";
import { teamSchema } from "@/lib/validations";
import type { Team } from "@/types";

type TeamFormProps = {
  team: Team;
  onSaved?: () => void;
};

export function TeamForm({ team, onSaved }: TeamFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: team.name,
    short_name: team.short_name,
    owner_name: team.owner_name ?? "",
    logo_url: team.logo_url ?? "",
    primary_color: team.primary_color,
    secondary_color: team.secondary_color,
    budget: team.budget,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = teamSchema.safeParse({
      ...form,
      owner_name: form.owner_name.trim() || null,
      logo_url: form.logo_url.trim() || null,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos no válidos");
      return;
    }

    try {
      await updateTeamClient(team.id, {
        name: parsed.data.name,
        short_name: parsed.data.short_name,
        owner_name: parsed.data.owner_name ?? null,
        logo_url: parsed.data.logo_url || null,
        primary_color: parsed.data.primary_color,
        secondary_color: parsed.data.secondary_color,
        budget: parsed.data.budget,
      });
      startTransition(() => {
        router.refresh();
        onSaved?.();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre">
        <Input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </Field>
      <Field label="Nombre corto">
        <Input
          required
          value={form.short_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, short_name: e.target.value }))
          }
        />
      </Field>
      <Field label="Propietario">
        <Input
          value={form.owner_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, owner_name: e.target.value }))
          }
          placeholder="Vacío por ahora"
        />
      </Field>
      <Field label="Logo (URL)">
        <Input
          value={form.logo_url}
          onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
          placeholder="https://..."
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Color principal">
          <Input
            type="color"
            value={form.primary_color}
            onChange={(e) =>
              setForm((f) => ({ ...f, primary_color: e.target.value }))
            }
            className="h-10 cursor-pointer p-1"
          />
        </Field>
        <Field label="Color secundario">
          <Input
            type="color"
            value={form.secondary_color}
            onChange={(e) =>
              setForm((f) => ({ ...f, secondary_color: e.target.value }))
            }
            className="h-10 cursor-pointer p-1"
          />
        </Field>
      </div>
      <Field label="Presupuesto">
        <MoneyInput
          value={form.budget}
          onChange={(budget) => setForm((f) => ({ ...f, budget }))}
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Guardando…" : "Guardar equipo"}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}
