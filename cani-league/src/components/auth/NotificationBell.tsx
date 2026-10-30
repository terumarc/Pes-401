"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { useViewer } from "@/components/auth/ViewerProvider";
import { cn } from "@/lib/utils";
import { usePendingCard } from "@/components/cards/CardsProvider";

type Notice = {
  id: string;
  created_at: string;
  kind: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
};

const LIMIT = 30;

/** Campanita con los avisos de la persona; llegan al momento (Realtime) y saltan como aviso emergente. */
export function NotificationBell({ className }: { className?: string }) {
  const viewer = useViewer();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const { pending, openCard } = usePendingCard();
  const userId = viewer?.userId;

  const load = useCallback(() => {
    if (!userId) return;
    supabase
      .from("notifications")
      .select("id, created_at, kind, title, body, link, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LIMIT)
      .then(({ data }) => {
        if (data) setItems(data);
      });
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) return;
    load();
    // Nombre único por montaje: si el componente se vuelve a montar antes de que se cierre el canal
    // anterior, Supabase devolvería ese mismo canal ya suscrito y fallaría.
    const channel = supabase
      .channel(`notifications:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notice;
          setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, LIMIT));
          // La carta por girar ya se abre sola como hoja: sin aviso emergente.
          if (n.kind !== "card_pending") toast(n.title, { description: n.body ?? undefined });
        },
      )
      .subscribe();
    // Al volver a la app (móvil en segundo plano) se recargan por si se perdió alguno.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    if (!userId || unread === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  }

  async function openNotice(n: Notice) {
    setOpen(false);
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: now } : p)));
      await supabase.from("notifications").update({ read_at: now }).eq("id", n.id);
    }
    // Aviso de carta por girar: se abre la carta en vez de ir a otra pantalla.
    if (n.kind === "card_pending" && pending) return openCard();
    if (n.link) router.push(n.link);
  }

  if (!viewer) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Avisos: ${unread} sin leer` : "Avisos"}
          className={cn(
            "relative flex size-11 items-center justify-center text-primary select-none active:opacity-50 md:size-9 md:rounded-full md:text-muted-foreground md:hover:bg-white/[0.06] md:hover:text-foreground",
            className,
          )}
        >
          <Bell className="size-[22px] md:size-[18px]" aria-hidden />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff453a] px-1 text-[11px] font-semibold text-white tabular-nums md:top-0 md:right-0">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-[min(92vw,380px)] gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
          <p className="text-[length:min(0.8824rem,22.5px)] font-semibold">Avisos</p>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-[length:min(0.8824rem,22.5px)] text-[#0a84ff] active:opacity-50 disabled:text-muted-foreground"
          >
            Marcar como leídos
          </button>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[length:min(0.8824rem,22.5px)] font-medium">Sin avisos</p>
            <p className="mt-1 text-[length:min(0.7647rem,19.5px)] text-muted-foreground">
              Aquí te avisamos de ofertas, fichajes, resultados y premios de tu club.
            </p>
          </div>
        ) : (
          <ul className="max-h-[min(60vh,440px)] overflow-y-auto py-1">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotice(n)}
                  className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] active:bg-white/[0.08]"
                >
                  <span
                    aria-hidden
                    className={cn("mt-[7px] size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-[#0a84ff]")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-[length:min(0.8824rem,22.5px)]", !n.read_at && "font-semibold")}>{n.title}</span>
                      <span className="shrink-0 text-[length:min(0.7059rem,18px)] text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(n.created_at), { locale: es })}
                      </span>
                    </span>
                    {n.body && <span className="mt-0.5 block text-[length:min(0.7647rem,19.5px)] leading-snug text-muted-foreground">{n.body}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/movimientos"
          onClick={() => setOpen(false)}
          className="block border-t border-border/80 px-4 py-3 text-center text-[length:min(0.8824rem,22.5px)] text-[#0a84ff] active:opacity-50"
        >
          Ver todos los movimientos
        </Link>
      </PopoverContent>
    </Popover>
  );
}
