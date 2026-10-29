"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { CommandMenu } from "@/components/layout/CommandMenu";

/** La barra lateral, la cabecera y las pestañas; la entrada y la invitación van sin nada de eso. */
export function AppChrome({ season, children }: { season: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/login" || pathname.startsWith("/unirse/");
  if (bare) return <>{children}</>;

  return (
    <>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader season={season} />
          <div className="flex flex-1 flex-col">
            <main className="flex-1 w-full overflow-x-hidden px-4 pt-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-4 lg:p-6">
              <div className="w-full">{children}</div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <MobileTabBar />
      <CommandMenu />
    </>
  );
}
