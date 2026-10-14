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
    <header className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:border-b sm:border-border/60 sm:pb-6">
      <div className="space-y-1.5">
        {eyebrow && (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-block size-1.5 rounded-full bg-primary ring-2 ring-primary/20" />
            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-foreground sm:text-3xl sm:font-semibold lg:text-4xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground/90 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2.5 shrink-0 sm:w-auto sm:self-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </header>
  );
}
