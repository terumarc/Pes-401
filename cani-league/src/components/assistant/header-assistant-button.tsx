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
      className="h-8 gap-1.5 px-3 text-[13px]"
    >
      <div className="flex size-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-black">
        7
      </div>
      <span>David Villa IA</span>
      <Sparkles className="size-3" />
    </Button>
  );
}
