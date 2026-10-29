import { cache } from "react";
import { logoSrc } from "@/lib/logo";
import { createClient } from "@/lib/supabase/server";

/** Quién está usando la app: su ficha de miembro de la liga. */
export type Viewer = {
  userId: string;
  memberId: string;
  name: string;
  email: string;
  teamId: string | null;
  teamName: string | null;
  teamLogo: string | null;
  teamColor: string | null;
  isAdmin: boolean;
  /** Ya ha pasado por la bienvenida (nombre y club). */
  onboarded: boolean;
};

export class AuthError extends Error {
  status: 401 | 403;
  constructor(message: string, status: 401 | 403 = 403) {
    super(message);
    this.status = status;
  }
}

/** Una vez por petición: lee la sesión y la ficha del miembro (la enlaza si es su primera vez). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: row } = await supabase
    .from("members")
    .select("*, team:teams(name, logo_url, primary_color)")
    .eq("user_id", userId)
    .maybeSingle();
  let member: { id: string; display_name: string; email: string; team_id: string | null; is_admin: boolean; onboarded_at: string | null } | null = row;
  type TeamBits = { name: string; logo_url: string | null; primary_color: string } | null;
  let team = (row?.team as TeamBits) ?? null;

  if (!member) {
    // Primera vez que entra: se enlaza su cuenta con su ficha de miembro.
    const { data: claimed } = await supabase.rpc("claim_membership");
    member = claimed && claimed.id ? claimed : null;
    if (member?.team_id) {
      const { data } = await supabase.from("teams").select("name, logo_url, primary_color").eq("id", member.team_id).maybeSingle();
      team = data ?? null;
    }
  }
  if (!member) return null;

  return {
    userId,
    memberId: member.id,
    name: member.display_name,
    email: member.email,
    teamId: member.team_id,
    teamName: team?.name ?? null,
    teamLogo: member.team_id ? logoSrc(member.team_id, team?.logo_url) : null,
    teamColor: team?.primary_color ?? null,
    isAdmin: member.is_admin,
    onboarded: !!member.onboarded_at,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthError("Tienes que entrar en la app para hacer esto.", 401);
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) throw new AuthError("Solo un admin puede hacer esto.");
  return viewer;
}

/** Puede actuar en nombre de ese club: es el suyo, o es admin. */
export function canActFor(viewer: Viewer, teamId: string | null | undefined): boolean {
  return viewer.isAdmin || (!!teamId && viewer.teamId === teamId);
}

export async function requireTeam(teamId: string | null | undefined): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!canActFor(viewer, teamId)) {
    throw new AuthError(
      viewer.teamId ? "Solo puedes hacer esto con tu club." : "Aún no tienes club asignado. Pídeselo a un admin.",
    );
  }
  return viewer;
}

/** Puede tocar algo en lo que juegan estos clubes (un partido): uno de los dos es el suyo, o es admin. */
export async function requireOneOf(teamIds: (string | null | undefined)[]): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin && !teamIds.some((id) => id && id === viewer.teamId)) {
    throw new AuthError("Solo pueden apuntar este partido los dos clubes que lo juegan o un admin.");
  }
  return viewer;
}

/** Respuesta JSON para las rutas /api cuando falla un permiso. */
export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  return null;
}
