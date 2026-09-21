"use client";

import { useState, useEffect } from "react";
import { parseMoneyInput, formatMoney } from "@/lib/format/money";
import { Input } from "@/components/ui/input";

type MoneyInputProps = {
  value: number;
  onChange: (euros: number) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
};

export function MoneyInput({
  value,
  onChange,
  disabled,
  id,
  placeholder = "Ej. 50000000",
  ariaLabel = "Presupuesto en euros",
}: MoneyInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="relative">
        <span
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none"
          aria-hidden="true"
        >
          €
        </span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={raw}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="pl-8 h-10 font-mono text-sm tabular-nums border-white/[0.1] bg-background/50 focus-visible:ring-2 focus-visible:ring-primary"
          onChange={(e) => {
            setRaw(e.target.value);
            setError(null);
          }}
          onBlur={() => {
            const parsed = parseMoneyInput(raw);
            if (parsed === null || parsed < 0) {
              setError("Importe no válido. Introduce una cantidad numérica.");
              setRaw(String(value));
              return;
            }
            onChange(parsed);
            setRaw(String(parsed));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs px-0.5">
        <span className="text-muted-foreground">Equivalencia:</span>
        <span className="font-mono font-semibold text-foreground tabular-nums">
          {formatMoney(value)}
        </span>
      </div>
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in-50" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
