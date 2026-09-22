"use client";

import React from "react";
import { useAssistant } from "./assistant-context";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function HeaderAssistantButton() {
  const { openAssistant } = useAssistant();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openAssistant}
      className="border-white/[0.1] bg-white/[0.03] text-xs font-medium text-foreground/90 hover:bg-white/[0.08] hover:text-amber-400 gap-1.5 transition-colors h-7 px-2.5"
    >
      <div className="size-3.5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-[8px] text-white font-black">
        7
      </div>
      <span>David Villa IA</span>
      <Sparkles className="size-3 text-amber-400" />
    </Button>
  );
}
