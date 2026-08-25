import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="font-display text-lg font-semibold tracking-tight">
          {title}
        </CardTitle>
        <Button variant="link" size="sm" className="h-auto px-0" asChild>
          <Link href={href}>
            {cta}
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
