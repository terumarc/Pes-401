"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
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
  const { setOpenMobile } = useSidebar();

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
                  "relative h-9 rounded-[10px] px-3 text-[length:min(0.8824rem,22.5px)] transition-colors",
                  item.isActive
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-foreground/85 hover:bg-white/[0.04]"
                )}
              >
                <Link
                  href={item.url}
                  prefetch={true}
                  onClick={() => setOpenMobile(false)}
                  className="flex items-center gap-2.5"
                >
                  <span className={cn("shrink-0", item.isActive ? "text-foreground" : "text-muted-foreground")}>
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
