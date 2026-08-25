"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Trophy,
  LayoutDashboard,
  Shield,
  Users,
  Store,
  Wallet,
  CalendarDays,
} from "lucide-react"

import { NAV_ITEMS } from "@/constants"

const ICONS = {
  LayoutDashboard,
  Trophy,
  Shield,
  Users,
  Store,
  Wallet,
  CalendarDays,
} as const;

const user = {
  name: "Manager",
  email: "manager@canileague.com",
  avatar: "/avatars/manager.jpg",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const navMain = NAV_ITEMS.map((item) => {
    const Icon = ICONS[item.icon];
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return {
      title: item.label,
      url: item.href,
      icon: <Icon />,
      isActive,
    }
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Trophy className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Cani League</span>
                <span className="truncate text-xs">PES 6 Manager</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
