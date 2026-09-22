import { GoogleGenAI } from "@google/genai";
import { toolDeclarations, executeTool } from "./tools";

export const DAVID_VILLA_SYSTEM_PROMPT = `
Eres David Villa Sánchez "El Guaje", legendario delantero asturiano, máximo goleador histórico de la selección española y campeón de Europa y del Mundo. Actualmente eres el Director Deportivo, Ojeador Jefe y Asesor Táctico oficial de la "Cani League" (la liga privada de mánagers para PES 6 / Cani Patch).

Tu personalidad y estilo de comunicación:
- Tratas al usuario con cercanía, camaradería y respeto de vestuario: "¡Qué pasa míster!", "Hola compañero", "A ver qué tenemos por aquí...", "Te digo una cosa...".
- Eres apasionado del fútbol y de la esencia de PES 6: conoces el valor de un desmarque letal, de la velocidad punta, del tiro con rosca y de una defensa sólida.
- Tienes conocimiento de las estadísticas de PES 6: velocidad (speed), aceleración (acceleration), potencia y precisión de tiro (shooting), estabilidad/balance (physical/balance), pase y regate.
- Valoras la gestión sensata: aconsejas fichajes acordes al presupuesto del club para no hipotecar la entidad, pero siempre buscando pólvora y calidad.
- REGLA DE ORO: Siempre que te pregunten sobre equipos, presupuestos, jugadores, mercado de fichajes, clasificación o calendario, DEBES consultar la información mediante las herramientas (tools) disponibles para ofrecer datos 100% reales de la base de datos de la liga. No inventes plantillas ni precios.
- Si recomiendas futbolistas, argumenta por qué encajan tácticamente (por ejemplo, si es para jugar a la contra, si tiene desborde por banda, etc.).
- Formatea siempre tus respuestas con Markdown bien estructurado (negritas, listas, tablas o viñetas cuando sea oportuno) y añade toques con emojis de fútbol (⚽, 🎯, ⚡, 🛡️, 💰, 📋).
`.trim();

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type StreamEvent =
  | { type: "tool_start"; tool: string; description: string }
  | { type: "tool_end"; tool: string; resultCount?: number }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

const TOOL_DESCRIPTIONS: Record<string, string> = {
  get_teams: "Consultando equipos y presupuestos de la liga...",
  get_standings: "Revisando la clasificación general...",
  search_players: "Buscando futbolistas en la base de datos...",
  get_team_roster: "Analizando la plantilla del equipo...",
  get_calendar_fixtures: "Revisando el calendario y resultados...",
  get_recent_transfers: "Comprobando los últimos traspasos...",
};

export async function* runDavidVillaAssistant(
  messages: ChatMessage[]
): AsyncGenerator<StreamEvent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    yield {
      type: "error",
      message:
        "No se ha configurado la variable GEMINI_API_KEY en .env.local. Por favor, añade tu clave de Google Gemini para hablar con David Villa.",
    };
    return;
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const ai = new GoogleGenAI({ apiKey });

  try {
    // Tomamos el último mensaje del usuario
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    // Convertir historial anterior para el chat
    const previousHistory = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = ai.chats.create({
      model: modelName,
      history: previousHistory,
      config: {
        systemInstruction: DAVID_VILLA_SYSTEM_PROMPT,
        temperature: 0.7,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    let currentResponse = await chat.sendMessage({ message: lastUserMessage });
    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      turns++;
      const functionCalls = currentResponse.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        // No hay más llamadas a tools; devolvemos el texto generado
        const text = currentResponse.text;
        if (text) {
          // Simulamos streaming suave del texto devuelto
          const words = text.split(" ");
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
            yield { type: "delta", text: chunk };
            await new Promise((r) => setTimeout(r, 15));
          }
        }
        yield { type: "done" };
        return;
      }

      // Procesar cada llamada a herramienta
      const toolResponseParts: any[] = [];
      for (const call of functionCalls) {
        const callName = call.name || "";
        if (!callName) continue;

        const desc = TOOL_DESCRIPTIONS[callName] || `Ejecutando ${callName}...`;
        yield { type: "tool_start", tool: callName, description: desc };

        const result = await executeTool(callName, (call.args as Record<string, any>) || {});

        let resultCount: number | undefined;
        if (result?.players?.length != null) resultCount = result.players.length;
        else if (result?.teams?.length != null) resultCount = result.teams.length;
        else if (result?.standings?.length != null) resultCount = result.standings.length;
        else if (result?.matches?.length != null) resultCount = result.matches.length;

        yield { type: "tool_end", tool: callName, resultCount };

        toolResponseParts.push({
          functionResponse: {
            name: callName,
            response: { result },
          },
        });
      }

      // Enviar resultados de vuelta al modelo
      currentResponse = await chat.sendMessage({ message: toolResponseParts });
    }

    yield { type: "done" };
  } catch (err: any) {
    console.error("Error en asistente David Villa:", err);
    let errMsg = err?.message || "Ocurrió un error inesperado al consultar con David Villa.";

    if (errMsg.includes("SERVICE_DISABLED") || errMsg.includes("has not been used in project") || errMsg.includes("it is disabled")) {
      errMsg = "La API de Gemini está desactivada en tu proyecto de Google Cloud. Por favor, actívala pulsando en: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=287149788478 y espera un minuto.";
    }

    yield {
      type: "error",
      message: errMsg,
    };
  }
}
