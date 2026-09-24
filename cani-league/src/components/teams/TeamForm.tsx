"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Tag,
  User,
  Wallet,
  Sparkles,
  Palette,
  Loader2,
  Check,
} from "lucide-react";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { TeamLogo } from "@/components/teams/TeamCard";
import { updateTeamAction } from "@/app/actions/teams";
import { teamSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
import type { Team } from "@/types";

type TeamFormProps = {
  team: Team;
  onSaved?: () => void;
};

const COLOR_PRESETS = [
  { name: "Blanco / Azul", primary: "#FFFFFF", secondary: "#1E3A8A" },
  { name: "Azulgrana", primary: "#004D98", secondary: "#A50044" },
  { name: "Rojiblanco", primary: "#CB3524", secondary: "#1B365D" },
  { name: "Verdiblanco", primary: "#00843D", secondary: "#FFFFFF" },
  { name: "Azul Real", primary: "#034694", secondary: "#FFFFFF" },
  { name: "Rojinegro", primary: "#FB090B", secondary: "#000000" },
  { name: "Nerazzurro", primary: "#0066B2", secondary: "#000000" },
  { name: "Oro / Azul", primary: "#002B49", secondary: "#FFC72C" },
];

export function TeamForm({ team, onSaved }: TeamFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: team.name,
    short_name: team.short_name,
    owner_name: team.owner_name ?? "",
    logo_url: team.logo_url ?? "",
    primary_color: team.primary_color || "#1E293B",
    secondary_color: team.secondary_color || "#0F172A",
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
      await updateTeamAction(team.id, {
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
      setError(err instanceof Error ? err.message : "No se pudo guardar los cambios");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      {/* TARJETA DE PREVISUALIZACIÓN EN VIVO (LIVE PREVIEW) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-400" />
            Vista previa en directo
          </span>
          <span className="text-[10px] lowercase text-muted-foreground/80">
            se actualiza al editar
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-card/80 shadow-md">
          {/* Banner con gradiente en vivo */}
          <div
            className="h-16 w-full p-3 transition-colors duration-300"
            style={{
              background: `linear-gradient(135deg, ${form.primary_color} 0%, ${form.secondary_color} 100%)`,
            }}
          >
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="bg-black/40 text-[10px] font-extrabold uppercase text-white/90 border-white/20 backdrop-blur-xs"
              >
                {form.short_name || "TAG"}
              </Badge>
              <div className="flex items-center gap-1.5">
                <span
                  className="size-3 rounded-full border border-white/40 shadow-xs"
                  style={{ backgroundColor: form.primary_color }}
                  title="Color primario"
                />
                <span
                  className="size-3 rounded-full border border-white/40 shadow-xs"
                  style={{ backgroundColor: form.secondary_color }}
                  title="Color secundario"
                />
              </div>
            </div>
          </div>

          <div className="px-4 pb-3.5 pt-0">
            <div className="-mt-7 flex items-center gap-3">
              <div className="rounded-full bg-card p-1 shadow-md ring-2 ring-white/[0.1]">
                <TeamLogo
                  name={form.name || "Club"}
                  logoUrl={form.logo_url || null}
                  color={form.primary_color}
                  size="md"
                />
              </div>
              <div className="min-w-0 pt-6">
                <h4 className="truncate font-display text-base font-bold uppercase text-foreground">
                  {form.name || "Nombre del Club"}
                </h4>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="size-3" />
                  <span className="truncate">
                    {form.owner_name?.trim() || "Sin propietario asignado"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CAMPOS DEL FORMULARIO */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Nombre oficial del Club" icon={<Shield className="size-3.5" />}>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Real Madrid, Arsenal FC..."
                className="h-10 border-white/[0.08] bg-white/[0.03]"
              />
            </Field>
          </div>

          <div>
            <Field label="Sigla (3-4 letras)" icon={<Tag className="size-3.5" />}>
              <Input
                required
                maxLength={5}
                value={form.short_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, short_name: e.target.value.toUpperCase() }))
                }
                placeholder="RMA, ARS..."
                className="h-10 border-white/[0.08] bg-white/[0.03] uppercase font-mono font-bold"
              />
            </Field>
          </div>
        </div>

        <Field label="Propietario / Mánager" icon={<User className="size-3.5" />}>
          <Input
            value={form.owner_name}
            onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
            placeholder="Nombre o alias del entrenador/mánager"
            className="h-10 border-white/[0.08] bg-white/[0.03]"
          />
        </Field>

        <ImageUpload
          label="Escudo / Logo del Club"
          value={form.logo_url}
          onChange={(logo_url) => setForm((f) => ({ ...f, logo_url }))}
          shape="circle"
          bucketName="teams"
        />

        {/* SELECCIÓN DE COLORES */}
        <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Palette className="size-3.5 text-primary" />
              <span>Colores del Club</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {form.primary_color} · {form.secondary_color}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                Color Primario
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primary_color: e.target.value }))
                  }
                  className="size-9 cursor-pointer rounded-lg border border-white/[0.1] bg-transparent p-0.5"
                  aria-label="Color primario"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, primary_color: e.target.value }))
                  }
                  className="h-9 font-mono text-xs uppercase border-white/[0.08] bg-white/[0.03]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">
                Color Secundario
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, secondary_color: e.target.value }))
                  }
                  className="size-9 cursor-pointer rounded-lg border border-white/[0.1] bg-transparent p-0.5"
                  aria-label="Color secundario"
                />
                <Input
                  value={form.secondary_color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, secondary_color: e.target.value }))
                  }
                  className="h-9 font-mono text-xs uppercase border-white/[0.08] bg-white/[0.03]"
                />
              </div>
            </div>
          </div>

          {/* PALETAS RÁPIDAS DE FÚTBOL */}
          <div className="pt-2 border-t border-white/[0.06]">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">
              Paletas Clásicas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      primary_color: preset.primary,
                      secondary_color: preset.secondary,
                    }))
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-all cursor-pointer"
                >
                  <span className="flex items-center -space-x-1">
                    <span
                      className="size-2.5 rounded-full border border-black/30"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="size-2.5 rounded-full border border-black/30"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Field label="Presupuesto del Club" icon={<Wallet className="size-3.5" />}>
          <MoneyInput
            value={form.budget}
            onChange={(budget) => setForm((f) => ({ ...f, budget }))}
          />
        </Field>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
          {error}
        </div>
      )}

      {/* BOTONES DE ACCIÓN */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        <Button
          type="submit"
          disabled={pending}
          size="lg"
          className="w-full gap-2 font-display font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition-all duration-200 cursor-pointer rounded-xl"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin text-white" />
              <span className="text-white font-bold">Guardando cambios…</span>
            </>
          ) : (
            <>
              <Check className="size-4 text-white" />
              <span className="text-white font-bold">Guardar Información del Club</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
        {icon}
        <span>{label}</span>
      </Label>
      {children}
    </div>
  );
}
