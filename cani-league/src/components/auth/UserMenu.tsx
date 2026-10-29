"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Activity, UserCog, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useViewer } from "@/components/auth/ViewerProvider";
import { signOutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/teams/TeamCard";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Ficha de quien ha entrado: su club, sus movimientos y cerrar sesión. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const viewer = useViewer();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!viewer) return null;

  function signOut() {
    startTransition(async () => {
      await signOutAction();
      router.replace("/login");
      router.refresh();
    });
  }

  // El escudo de tu club hace de foto de perfil; sin club, tus iniciales.
  const avatar =
    viewer.teamId && viewer.teamName ? (
      <span aria-hidden className="shrink-0">
        <TeamLogo name={viewer.teamName} logoUrl={viewer.teamLogo} color={viewer.teamColor ?? "#2c2c2e"} size="xs" />
      </span>
    ) : (
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#2c2c2e] text-[12px] font-semibold text-white"
      >
        {initials(viewer.name) || "?"}
      </span>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label={`Tu cuenta: ${viewer.name}`}
            className="flex size-11 items-center justify-center select-none active:opacity-50"
          >
            {avatar}
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-sidebar-accent group-data-[collapsible=icon]:p-0"
          >
            {avatar}
            <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold">{viewer.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {viewer.teamName ?? "Sin club"}
                {viewer.isAdmin ? " · Admin" : ""}
              </span>
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" aria-hidden />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={compact ? "bottom" : "top"} className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold text-foreground">{viewer.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{viewer.teamName ?? "Sin club"}{viewer.isAdmin ? " · Admin" : ""}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {viewer.teamId && (
          <DropdownMenuItem asChild>
            <Link href={`/teams/${viewer.teamId}`}>
              <Shield aria-hidden />
              {viewer.teamName ?? "Mi club"}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/movimientos">
            <Activity aria-hidden />
            Movimientos
          </Link>
        </DropdownMenuItem>
        {viewer.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/usuarios">
              <UserCog aria-hidden />
              Usuarios
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={pending} className={cn("text-[#ff453a] focus:text-[#ff453a]")}>
          <LogOut aria-hidden className="text-current" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
