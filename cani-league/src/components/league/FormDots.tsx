import { cn } from "@/lib/utils";
import type { FormResult } from "@/lib/stats";

const LABEL: Record<FormResult, string> = { V: "victoria", E: "empate", D: "derrota" };

/** Racha de los últimos partidos: V verde, E gris, D roja (con la letra, no solo el color). */
export function FormDots({ form, className }: { form: FormResult[]; className?: string }) {
  if (!form.length) return null;
  return (
    <span className={cn("inline-flex gap-1", className)} aria-label={`Últimos partidos: ${form.map((f) => LABEL[f]).join(", ")}`}>
      {form.map((f, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "flex size-5 items-center justify-center rounded-full text-[12px] font-bold",
            f === "V" && "bg-[#30d158] text-black",
            f === "E" && "bg-[#636366] text-white",
            f === "D" && "bg-[#ff453a] text-white",
          )}
        >
          {f}
        </span>
      ))}
    </span>
  );
}
