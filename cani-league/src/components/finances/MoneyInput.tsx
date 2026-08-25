"use client";

import { useState } from "react";
import { parseMoneyInput, formatMoney } from "@/lib/format/money";
import { Input } from "@/components/ui/input";

type MoneyInputProps = {
  value: number;
  onChange: (euros: number) => void;
  disabled?: boolean;
  id?: string;
};

export function MoneyInput({ value, onChange, disabled, id }: MoneyInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
          €
        </span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={raw}
          className="pl-8"
          onChange={(e) => {
            setRaw(e.target.value);
            setError(null);
          }}
          onBlur={() => {
            const parsed = parseMoneyInput(raw);
            if (parsed === null || parsed < 0) {
              setError("Importe no válido");
              setRaw(String(value));
              return;
            }
            onChange(parsed);
            setRaw(String(parsed));
          }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{formatMoney(value)}</p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
