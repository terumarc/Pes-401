import { redirect } from "next/navigation";

/** El antiguo Inicio ya no existe: los enlaces guardados van a Partidos. */
export default function LeaguePage() {
  redirect("/calendar");
}
