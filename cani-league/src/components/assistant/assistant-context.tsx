"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ToolLog {
  tool: string;
  description: string;
  count?: number;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolLogs?: ToolLog[];
  error?: boolean;
}

interface AssistantContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  messages: AssistantMessage[];
  isGenerating: boolean;
  currentToolStatus: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const INITIAL_GREETING: AssistantMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "¡Buenas, míster! Aquí David Villa «El Guaje». Estoy a tu disposición como Director Deportivo y asesor de la Cani League. ¿Qué necesitas? Puedo ojetearte delanteros rápidos en el mercado, analizar las plantillas de los rivales, revisar presupuestos o decirte cómo va la tabla.",
};

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([INITIAL_GREETING]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentToolStatus, setCurrentToolStatus] = useState<string | null>(null);

  const openAssistant = useCallback(() => setIsOpen(true), []);
  const closeAssistant = useCallback(() => setIsOpen(false), []);
  const toggleAssistant = useCallback(() => setIsOpen((prev) => !prev), []);

  const clearMessages = useCallback(() => {
    setMessages([INITIAL_GREETING]);
  }, []);

  // Atajo de teclado: Ctrl + J o Cmd + J para abrir/cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleAssistant();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAssistant]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isGenerating) return;

      const userMsg: AssistantMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userText.trim(),
      };

      const assistantMsgId = `asst-${Date.now()}`;
      const assistantPlaceholder: AssistantMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        toolLogs: [],
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setIsGenerating(true);
      setCurrentToolStatus(null);

      // Historial para enviar a la API
      const conversationPayload = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversationPayload }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || `Error ${response.status}: No se pudo contactar con David Villa.`);
        }

        if (!response.body) {
          throw new Error("No se recibió respuesta en streaming.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "tool_start") {
                setCurrentToolStatus(event.description || `Consultando ${event.tool}...`);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          toolLogs: [
                            ...(m.toolLogs || []),
                            { tool: event.tool, description: event.description },
                          ],
                        }
                      : m
                  )
                );
              } else if (event.type === "tool_end") {
                setCurrentToolStatus(null);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          toolLogs: (m.toolLogs || []).map((tl) =>
                            tl.tool === event.tool
                              ? { ...tl, count: event.resultCount }
                              : tl
                          ),
                        }
                      : m
                  )
                );
              } else if (event.type === "delta") {
                setCurrentToolStatus(null);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + event.text }
                      : m
                  )
                );
              } else if (event.type === "error") {
                setCurrentToolStatus(null);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content:
                            m.content +
                            `\n\n> ⚠️ **Aviso:** ${event.message}`,
                          error: true,
                        }
                      : m
                  )
                );
              }
            } catch (parseErr) {
              console.error("Error parseando evento SSE:", parseErr);
            }
          }
        }
      } catch (err: any) {
        console.error("Error en consulta:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    m.content ||
                    `⚠️ **Error:** ${err?.message || "No se pudo conectar con David Villa."}`,
                  error: true,
                }
              : m
          )
        );
      } finally {
        setIsGenerating(false);
        setCurrentToolStatus(null);
      }
    },
    [messages, isGenerating]
  );

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        setIsOpen,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        messages,
        isGenerating,
        currentToolStatus,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant debe usarse dentro de un AssistantProvider");
  }
  return context;
}
