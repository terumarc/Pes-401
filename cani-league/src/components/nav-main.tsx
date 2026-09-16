"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
    isActive?: boolean;
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1 px-1">
        <SidebarMenu className="gap-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                asChild
                className={cn(
                  "relative h-9 rounded-lg px-3 text-xs sm:text-sm font-medium transition-all duration-150",
                  item.isActive
                    ? "bg-white/[0.08] text-foreground font-semibold shadow-xs border border-white/[0.08]"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <Link href={item.url} className="flex items-center gap-2.5">
                  <span className={cn("shrink-0 transition-colors", item.isActive ? "text-primary" : "text-muted-foreground")}>
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                  {item.isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
