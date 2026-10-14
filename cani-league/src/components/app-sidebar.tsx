"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Trophy,
  LayoutDashboard,
  Shield,
  Users,
  Store,
  Wallet,
  CalendarDays,
  Swords,
  ListOrdered,
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
  Swords,
  ListOrdered,
} as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  // Auto-close mobile sidebar on route change
  React.useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  const navMain = NAV_ITEMS.map((item) => {
    const Icon = ICONS[item.icon as keyof typeof ICONS] || Trophy;
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return {
      title: item.label,
      url: item.href,
      icon: <Icon className="size-4" />,
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
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <Link href="/league" onClick={() => setOpenMobile(false)}>
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Trophy className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Cani League</span>
                  <span className="truncate text-xs text-muted-foreground">PES 6 Manager</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          PES 6 · Cani Patch
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
