import Link from "next/link";
import { Store, Shield, Trophy, Wallet, CalendarDays, ArrowRight } from "lucide-react";

export function DashboardQuickActions() {
  const actions = [
    {
      label: "Mercado de Fichajes",
      description: "Cláusulas y agentes libres",
      href: "/market",
      icon: <Store className="size-4 text-emerald-400" />,
    },
    {
      label: "Clubes y Plantillas",
      description: "Fichas, alineaciones y medias",
      href: "/teams",
      icon: <Shield className="size-4 text-blue-400" />,
    },
    {
      label: "Clasificación en Directo",
      description: "Puntos, podio y orden de tabla",
      href: "/standings",
      icon: <Trophy className="size-4 text-amber-400" />,
    },
    {
      label: "Control de Finanzas",
      description: "Presupuestos y límites salariales",
      href: "/finances",
      icon: <Wallet className="size-4 text-purple-400" />,
    },
    {
      label: "Calendario de Partidos",
      description: "Jornadas, resultados y acta",
      href: "/calendar",
      icon: <CalendarDays className="size-4 text-rose-400" />,
    },
  ];

  return (
    <nav
      aria-label="Acciones rápidas del manager"
      className="w-full rounded-2xl border border-white/[0.08] bg-card/40 p-3.5 sm:p-4 backdrop-blur-md shadow-sm"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-3 mb-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acciones Rápidas
          </h2>
          <p className="text-xs text-foreground/80 mt-0.5">
            Accesos directos a la operativa diaria del campeonato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map((act) => (
          <Link
            key={act.label}
            href={act.href}
            className="group flex min-h-[44px] items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] transition-colors group-hover:bg-white/[0.08]">
                {act.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {act.label}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {act.description}
                </p>
              </div>
            </div>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </nav>
  );
}
