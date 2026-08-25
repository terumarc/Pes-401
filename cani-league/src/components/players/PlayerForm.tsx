"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoneyInput } from "@/components/finances/MoneyInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAYER_POSITIONS, STAT_LABELS } from "@/constants";
import {
  createPlayerClient,
  updatePlayerClient,
} from "@/lib/data/mutations";
import { playerSchema } from "@/lib/validations";
import type { Player, Team } from "@/types";

type PlayerFormProps = {
  teams: Team[];
  player?: Player;
  defaultTeamId?: string;
  onSaved?: (playerId: string) => void;
};

function emptyStat(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function PlayerForm({
  teams,
  player,
  defaultTeamId,
  onSaved,
}: PlayerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo(
    () => ({
      name: player?.name ?? "",
      short_name: player?.short_name ?? "",
      team_id: player?.team_id ?? defaultTeamId ?? teams[0]?.id ?? "",
      position: player?.position ?? "CMF",
      age: emptyStat(player?.age),
      nationality: player?.nationality ?? "",
      photo_url: player?.photo_url ?? "",
      overall: emptyStat(player?.overall),
      speed: emptyStat(player?.speed),
      acceleration: emptyStat(player?.acceleration),
      shooting: emptyStat(player?.shooting),
      passing: emptyStat(player?.passing),
      dribbling: emptyStat(player?.dribbling),
      defending: emptyStat(player?.defending),
      physical: emptyStat(player?.physical),
      market_value: player?.market_value ?? 0,
      transfer_price: player?.transfer_price ?? 0,
      available_in_market: player?.available_in_market ?? false,
    }),
    [player, defaultTeamId, teams],
  );

  const [form, setForm] = useState(initial);

  function parseOptionalInt(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      short_name: form.short_name.trim() || null,
      team_id: form.team_id,
      position: form.position,
      age: parseOptionalInt(form.age),
      nationality: form.nationality.trim() || null,
      photo_url: form.photo_url.trim() || null,
      overall: parseOptionalInt(form.overall),
      speed: parseOptionalInt(form.speed),
      acceleration: parseOptionalInt(form.acceleration),
      shooting: parseOptionalInt(form.shooting),
      passing: parseOptionalInt(form.passing),
      dribbling: parseOptionalInt(form.dribbling),
      defending: parseOptionalInt(form.defending),
      physical: parseOptionalInt(form.physical),
      market_value: form.market_value,
      transfer_price: form.transfer_price,
      available_in_market: form.available_in_market,
    };

    const parsed = playerSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos no válidos");
      return;
    }

    try {
      const saved = player
        ? await updatePlayerClient(player.id, parsed.data)
        : await createPlayerClient(parsed.data);

      startTransition(() => {
        router.refresh();
        onSaved?.(saved.id);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        {player ? "Editar jugador" : "Nuevo jugador"}
      </h2>

      <Field label="Nombre">
        <Input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Equipo">
          <Select
            value={form.team_id}
            onValueChange={(team_id) =>
              setForm((f) => ({ ...f, team_id: team_id ?? f.team_id }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar equipo" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Posición">
          <Select
            value={form.position}
            onValueChange={(position) =>
              setForm((f) => ({ ...f, position: position ?? f.position }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Posición" />
            </SelectTrigger>
            <SelectContent>
              {PLAYER_POSITIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Edad">
          <Input
            inputMode="numeric"
            value={form.age}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            placeholder="Opcional"
          />
        </Field>
        <Field label="Overall">
          <Input
            inputMode="numeric"
            value={form.overall}
            onChange={(e) =>
              setForm((f) => ({ ...f, overall: e.target.value }))
            }
            placeholder="0–100"
          />
        </Field>
        <Field label="Nacionalidad">
          <Input
            value={form.nationality}
            onChange={(e) =>
              setForm((f) => ({ ...f, nationality: e.target.value }))
            }
            placeholder="Opcional"
          />
        </Field>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Stats
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_LABELS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <Input
                inputMode="numeric"
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                placeholder="—"
              />
            </Field>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Valor
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor de mercado">
            <MoneyInput
              value={form.market_value}
              onChange={(market_value) =>
                setForm((f) => ({ ...f, market_value }))
              }
            />
          </Field>
          <Field label="Precio de fichaje">
            <MoneyInput
              value={form.transfer_price}
              onChange={(transfer_price) =>
                setForm((f) => ({ ...f, transfer_price }))
              }
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="market"
          checked={form.available_in_market}
          onCheckedChange={(checked) =>
            setForm((f) => ({
              ...f,
              available_in_market: checked === true,
            }))
          }
        />
        <Label htmlFor="market" className="text-sm text-muted-foreground">
          Disponible en mercado
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Guardando…" : "Guardar jugador"}
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
