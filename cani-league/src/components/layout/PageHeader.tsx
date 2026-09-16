import React from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between border-b border-white/[0.06] pb-6">
      <div className="space-y-1.5">
        {eyebrow && (
          <div className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500/80 ring-2 ring-emerald-500/20" />
            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground/90 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </header>
  );
}
