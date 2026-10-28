import React from "react";

type PageHeaderProps = {
  /** Ya no se muestran: se mantienen para no romper las llamadas existentes. */
  eyebrow?: string;
  description?: string;
  badge?: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
};

/** Título grande al estilo iOS. Sin etiqueta superior ni descripción. */
export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
      <h1 className="text-[length:min(2rem,51px)] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">{title}</h1>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
