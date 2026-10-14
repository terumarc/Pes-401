import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AssistantProvider } from "@/components/assistant/assistant-context";
import { AssistantSheet } from "@/components/assistant/assistant-sheet";
import { AssistantTrigger } from "@/components/assistant/assistant-trigger";
import { RouteProgressBar } from "@/components/layout/RouteProgressBar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { CommandMenu } from "@/components/layout/CommandMenu";
import { getPrimaryLeague } from "@/lib/data/league";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import "./globals.css";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Cani League Manager",
  description: "Manager externo para la liga PES 6 / Cani Patch",
  applicationName: "Cani League",
  appleWebApp: {
    capable: true,
    title: "Cani League",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c1411",
};

async function getSeason(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return (await getPrimaryLeague())?.season ?? null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const season = await getSeason();
  return (
    <html lang="es" className={cn("dark antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <RouteProgressBar />
        <TooltipProvider>
          <AssistantProvider>
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
                    <div className="mx-auto w-full max-w-[1400px]">{children}</div>
                  </main>
                </div>
              </SidebarInset>
            </SidebarProvider>
            <MobileTabBar />
            <CommandMenu />
            <AssistantSheet />
            <AssistantTrigger />
          </AssistantProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
