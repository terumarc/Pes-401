import { redirect } from "next/navigation";

/** Los enlaces de invitación antiguos llevan a la entrada: ya no hace falta enlace para entrar. */
export default function UnirsePage() {
  redirect("/login");
}
