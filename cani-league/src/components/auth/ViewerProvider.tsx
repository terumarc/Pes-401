"use client";

import { createContext, useContext } from "react";

/** Lo que la interfaz necesita saber de quien usa la app (los permisos de verdad se comprueban en el servidor). */
export type ClientViewer = {
  userId: string;
  memberId: string;
  name: string;
  email: string;
  teamId: string | null;
  teamName: string | null;
  teamLogo: string | null;
  teamColor: string | null;
  isAdmin: boolean;
};

const ViewerContext = createContext<ClientViewer | null>(null);

export function ViewerProvider({ viewer, children }: { viewer: ClientViewer | null; children: React.ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ClientViewer | null {
  return useContext(ViewerContext);
}

/** Puede actuar en nombre de ese club: es el suyo, o es admin. */
export function canActFor(viewer: ClientViewer | null, teamId: string | null | undefined): boolean {
  if (!viewer) return false;
  return viewer.isAdmin || (!!teamId && viewer.teamId === teamId);
}
