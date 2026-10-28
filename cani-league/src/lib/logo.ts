/**
 * Los escudos se guardan en la base de datos como imágenes incrustadas (data:…), de unos 30 KB cada uno.
 * Si viajan dentro de cada partido o jugador, una lista de partidos pesa varios MB.
 * Aquí se cambian por una dirección corta (/api/logo/<id>) que el navegador descarga una vez y guarda.
 */
export const LOGO_ROUTE = "/api/logo/";
/** Lo mismo para las fotos de jugador incrustadas. */
export const PHOTO_ROUTE = "/api/photo/";

/** Huella corta del contenido, para que al cambiar el escudo cambie la dirección y no se vea el viejo. */
function fingerprint(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 7) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36) + s.length.toString(36);
}

export function logoSrc(teamId: string, logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  if (!logoUrl.startsWith("data:")) return logoUrl;
  return `${LOGO_ROUTE}${teamId}?v=${fingerprint(logoUrl)}`;
}

export function photoSrc(playerId: string, photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  if (!photoUrl.startsWith("data:")) return photoUrl;
  return `${PHOTO_ROUTE}${playerId}?v=${fingerprint(photoUrl)}`;
}

/** Recorre lo que devuelve una consulta y cambia cada escudo y foto incrustados por su dirección corta. */
export function withLogoUrls<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) withLogoUrls(item);
  } else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.logo_url === "string" && typeof obj.id === "string" && obj.logo_url.startsWith("data:")) {
      obj.logo_url = logoSrc(obj.id, obj.logo_url);
    }
    if (typeof obj.photo_url === "string" && typeof obj.id === "string" && obj.photo_url.startsWith("data:")) {
      obj.photo_url = photoSrc(obj.id, obj.photo_url);
    }
    for (const v of Object.values(obj)) if (v && typeof v === "object") withLogoUrls(v);
  }
  return value;
}
