type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm text-ink-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions}
    </header>
  );
}
