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
  Medal,
  Goal,
  History,
  Activity,
  UserCog,
  Newspaper,
} from "lucide-react"

import { ADMIN_NAV_ITEMS, NAV_ITEMS } from "@/constants"
import { useViewer } from "@/components/auth/ViewerProvider"
import { UserMenu } from "@/components/auth/UserMenu"
import { CaniLeagueCrest } from "@/components/brand/CaniLeagueCrest"

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
  Medal,
  Goal,
  History,
  Activity,
  UserCog,
  Newspaper,
} as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const viewer = useViewer()

  // Auto-close mobile sidebar on route change
  React.useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  const items = viewer?.isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;
  const navMain = items.map((item) => {
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
              <Link href="/calendar" onClick={() => setOpenMobile(false)}>
                <CaniLeagueCrest title="" className="h-8 w-auto shrink-0" />
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
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
