import { formatMoney } from "@/lib/format/money";

type BudgetDisplayProps = {
  amount: number;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "font-display text-2xl font-semibold tracking-tight sm:text-3xl",
};

export function BudgetDisplay({
  amount,
  className = "",
  size = "md",
}: BudgetDisplayProps) {
  return (
    <span className={`tabular-nums text-ink ${sizeClass[size]} ${className}`}>
      {formatMoney(amount)}
    </span>
  );
}
