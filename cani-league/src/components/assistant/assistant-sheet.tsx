"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAssistant } from "./assistant-context";
import { MarkdownView } from "./markdown-view";
import {
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  Search,
  CheckCircle2,
  Loader2,
  Flame,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  {
    label: "🎯 Delantero rápido < 15M€",
    prompt: "Recomiéndame un delantero rápido disponible en el mercado por menos de 15M€ y dime sus stats clave.",
  },
  {
    label: "📊 Tabla de clasificación",
    prompt: "¿Cómo va la clasificación actual de la liga y quién es el líder?",
  },
  {
    label: "💰 Presupuestos de equipos",
    prompt: "¿Cuáles son los presupuestos actuales de todos los equipos de la liga?",
  },
  {
    label: "📋 Analizar plantilla",
    prompt: "Analiza la plantilla de Los Canis: dime sus mejores jugadores y en qué posiciones necesitan refuerzos.",
  },
  {
    label: "⚡ Jugadores más veloces",
    prompt: "¿Quiénes son los 5 futbolistas con mayor velocidad y aceleración de la liga?",
  },
  {
    label: "🔄 Últimos fichajes",
    prompt: "¿Cuáles han sido los últimos traspasos realizados en el mercado?",
  },
];

export function AssistantSheet() {
  const {
    isOpen,
    setIsOpen,
    messages,
    sendMessage,
    isGenerating,
    currentToolStatus,
    clearMessages,
  } = useAssistant();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentToolStatus, isGenerating]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const text = input;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isGenerating) return;
    sendMessage(prompt);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-white/[0.08] shadow-2xl"
      >
        {/* Cabecera personalizada */}
        <SheetHeader className="p-4 border-b border-white/[0.08] bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-10 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 flex items-center justify-center text-white font-bold shadow-md shadow-orange-500/20">
                <span className="text-xs tracking-tighter font-black">#7</span>
              </div>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base font-bold text-foreground">
                  David Villa
                </SheetTitle>
                <Badge
                  variant="outline"
                  className="bg-primary/10 border-primary/20 text-primary text-[10px] font-semibold tracking-wide py-0 h-4"
                >
                  «El Guaje»
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Sparkles className="size-3 text-amber-400" />
                Director Deportivo & Asesor de PES 6
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 mr-7">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
              onClick={clearMessages}
              title="Reiniciar conversación"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Lista de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1.5 max-w-[88%]",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                {msg.role === "assistant" ? (
                  <>
                    <Bot className="size-3 text-amber-400" />
                    <span className="font-semibold text-foreground/80">David Villa</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">Tú</span>
                    <User className="size-3" />
                  </>
                )}
              </div>

              {/* Registro de herramientas ejecutadas */}
              {msg.toolLogs && msg.toolLogs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 my-1">
                  {msg.toolLogs.map((tool, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-muted/60 border border-white/[0.06] text-muted-foreground"
                    >
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      <span>{tool.description}</span>
                      {tool.count != null && (
                        <span className="font-mono text-primary font-bold">
                          ({tool.count})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Contenido del mensaje */}
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-xs"
                    : msg.error
                    ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-bl-xs"
                    : "bg-muted/40 border border-white/[0.08] text-foreground rounded-bl-xs"
                )}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : msg.content ? (
                  <MarkdownView content={msg.content} />
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground py-1 text-xs">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    <span>David Villa está analizando la jugada...</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Estado de ejecución de herramienta en vivo */}
          {currentToolStatus && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 border border-white/[0.05] rounded-lg px-3 py-2 animate-pulse w-fit">
              <Search className="size-3.5 text-amber-400 animate-spin" />
              <span>{currentToolStatus}</span>
            </div>
          )}

          {/* Sugerencias rápidas si la conversación está recién iniciada */}
          {messages.length === 1 && !isGenerating && (
            <div className="pt-2 pb-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
                <Flame className="size-3.5 text-orange-400" />
                <span className="font-medium">Consultas rápidas con El Guaje:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickPrompt(item.prompt)}
                    className="text-left text-xs p-2.5 rounded-xl border border-white/[0.08] bg-muted/20 hover:bg-muted/50 hover:border-primary/40 transition-all text-muted-foreground hover:text-foreground group cursor-pointer"
                  >
                    <span className="font-medium block text-foreground/90 group-hover:text-primary transition-colors">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Barra de entrada de texto */}
        <div className="p-4 border-t border-white/[0.08] bg-muted/10 shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="relative rounded-xl border border-white/[0.12] bg-background/80 focus-within:border-primary/60 transition-colors shadow-inner">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntale a David Villa sobre fichajes, tácticas, presupuestos..."
                rows={2}
                disabled={isGenerating}
                className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60 pr-12 min-h-[58px]"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isGenerating}
                className="absolute right-2 bottom-2 size-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-40 transition-opacity"
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 px-1">
              <span>Enter para enviar, Shift+Enter para nueva línea</span>
              <span className="font-mono text-[10px] hidden sm:inline">Ctrl + J</span>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
