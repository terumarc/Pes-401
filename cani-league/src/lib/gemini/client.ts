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

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  // Convertir mensajes al formato de contents de Gemini
  const contents: any[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    let turns = 0;
    const maxTurns = 5;

    while (turns < maxTurns) {
      turns++;

      // Llamada para evaluar si se requieren tools
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: DAVID_VILLA_SYSTEM_PROMPT,
          temperature: 0.7,
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });

      const candidate = response.candidates?.[0];
      const functionCalls = response.functionCalls;

      // Si el modelo solicita ejecutar una o más herramientas
      if (functionCalls && functionCalls.length > 0) {
        // Agregar la respuesta del modelo (con sus tool calls) al historial de contents
        if (candidate?.content) {
          contents.push(candidate.content);
        }

        const toolResponsesParts: any[] = [];

        for (const call of functionCalls) {
          if (!call.name) continue;
          const toolName = call.name;
          const desc =
            TOOL_DESCRIPTIONS[toolName] || `Ejecutando ${toolName}...`;
          yield { type: "tool_start", tool: toolName, description: desc };

          const result = await executeTool(toolName, (call.args as Record<string, any>) || {});
          
          let resultCount: number | undefined;
          if (result?.players?.length != null) resultCount = result.players.length;
          else if (result?.teams?.length != null) resultCount = result.teams.length;
          else if (result?.standings?.length != null) resultCount = result.standings.length;
          else if (result?.matches?.length != null) resultCount = result.matches.length;

          yield { type: "tool_end", tool: toolName, resultCount };

          toolResponsesParts.push({
            functionResponse: {
              name: toolName,
              response: { result },
            },
          });
        }

        // Agregar las respuestas de las tools como turno de usuario/tool
        contents.push({
          role: "user",
          parts: toolResponsesParts,
        });

        // Continuamos el bucle para que el modelo procese los datos obtenidos
        continue;
      }

      // Si no hay más llamadas a herramientas, transmitimos en streaming la respuesta final
      const stream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction: DAVID_VILLA_SYSTEM_PROMPT,
          temperature: 0.7,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          yield { type: "delta", text };
        }
      }

      yield { type: "done" };
      return;
    }

    yield { type: "done" };
  } catch (err: any) {
    console.error("Error en asistente David Villa:", err);
    yield {
      type: "error",
      message:
        err?.message || "Ocurrió un error inesperado al consultar con David Villa.",
    };
  }
}
