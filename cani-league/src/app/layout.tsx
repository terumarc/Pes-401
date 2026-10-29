import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { RouteProgressBar } from "@/components/layout/RouteProgressBar";
import { AppChrome } from "@/components/layout/AppChrome";
import { ViewerProvider, type ClientViewer } from "@/components/auth/ViewerProvider";
import { getViewer } from "@/lib/auth";
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
  themeColor: "#000000",
};

async function getSeason(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return (await getPrimaryLeague())?.season ?? null;
  } catch {
    return null;
  }
}

async function getClientViewer(): Promise<ClientViewer | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const viewer = await getViewer();
    if (!viewer) return null;
    return {
      userId: viewer.userId,
      memberId: viewer.memberId,
      name: viewer.name,
      email: viewer.email,
      teamId: viewer.teamId,
      teamName: viewer.teamName,
      isAdmin: viewer.isAdmin,
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [season, viewer] = await Promise.all([getSeason(), getClientViewer()]);
  return (
    <html lang="es" className={cn("dark antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* Marca la página cuando la letra base es grande (Dynamic Type o zoom de texto), antes de pintar. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var d=document.documentElement;function c(){d.toggleAttribute('data-large-text',parseFloat(getComputedStyle(d).fontSize)>=21)}c();addEventListener('resize',c);document.addEventListener('visibilitychange',c)})()",
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <RouteProgressBar />
        <TooltipProvider>
          <ViewerProvider viewer={viewer}>
            <AppChrome season={season}>{children}</AppChrome>
          </ViewerProvider>
          <Toaster theme="dark" position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}
