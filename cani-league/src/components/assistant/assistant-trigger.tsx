"use client";

import React from "react";
import { useAssistant } from "./assistant-context";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssistantTrigger() {
  const { toggleAssistant, isOpen } = useAssistant();

  if (isOpen) return null;

  return (
    <button
      onClick={toggleAssistant}
      type="button"
      className={cn(
        "fixed bottom-5 right-5 z-40 group cursor-pointer",
        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-full",
        "bg-background/90 hover:bg-background backdrop-blur-md",
        "border border-white/[0.12] hover:border-amber-500/50",
        "shadow-lg shadow-black/40 hover:shadow-amber-500/10",
        "transition-all duration-200 hover:scale-105 active:scale-95"
      )}
      aria-label="Abrir asistente de IA David Villa"
      title="Hablar con David Villa (Ctrl + J)"
    >
      <div className="relative flex items-center justify-center size-7 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 text-white font-bold shadow-xs">
        <span className="text-[10px] font-black tracking-tighter">#7</span>
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-foreground tracking-tight group-hover:text-amber-400 transition-colors">
            David Villa
          </span>
          <Sparkles className="size-3 text-amber-400 group-hover:rotate-12 transition-transform" />
        </div>
        <span className="text-[10px] text-muted-foreground leading-none">
          Director Deportivo IA
        </span>
      </div>

      <kbd className="hidden sm:inline-block ml-1 rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground font-semibold">
        Ctrl+J
      </kbd>
    </button>
  );
}
