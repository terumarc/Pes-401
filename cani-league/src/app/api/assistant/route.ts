import { NextResponse } from "next/server";
import { runDavidVillaAssistant, type ChatMessage } from "@/lib/gemini/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body?.messages as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de mensajes no vacío." },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const generator = runDavidVillaAssistant(messages);

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await generator.next();
          if (done) {
            controller.close();
            return;
          }
          const payload = `data: ${JSON.stringify(value)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err: any) {
          const errorPayload = `data: ${JSON.stringify({
            type: "error",
            message: err?.message || "Error procesando el flujo de respuesta.",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorPayload));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno del servidor en el asistente." },
      { status: 500 }
    );
  }
}
