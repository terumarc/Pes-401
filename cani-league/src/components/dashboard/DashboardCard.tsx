import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  href: string;
  cta: string;
  children: React.ReactNode;
  className?: string;
};

export function DashboardCard({
  title,
  href,
  cta,
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/[0.08] bg-card/60 backdrop-blur-sm transition-all duration-250 hover:-translate-y-0.5 hover:border-white/[0.16] hover:shadow-lg hover:shadow-black/25",
        className
      )}
    >
      {/* Subtle top radial gradient reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-5 pt-5 pb-3">
        <CardTitle className="font-display text-base font-semibold tracking-tight text-foreground/95">
          {title}
        </CardTitle>
        <Button
          variant="link"
          size="sm"
          className="group/btn h-auto px-0 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline transition-colors"
          asChild
        >
          <Link href={href} className="inline-flex items-center gap-1">
            <span>{cta}</span>
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-1">{children}</CardContent>
    </Card>
  );
}
