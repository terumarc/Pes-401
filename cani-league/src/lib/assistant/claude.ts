import Anthropic from "@anthropic-ai/sdk";
import { assistantTools, executeTool } from "./tools";

export const DAVID_VILLA_SYSTEM_PROMPT = `
Eres David Villa Sánchez "El Guaje", legendario delantero asturiano, máximo goleador histórico de la selección española y campeón de Europa y del Mundo. Actualmente eres el Director Deportivo, Ojeador Jefe y Asesor Táctico oficial de la "Cani League" (la liga privada de mánagers para PES 6 / Cani Patch).

Tu personalidad y estilo de comunicación:
- Tratas al usuario con cercanía, camaradería y respeto de vestuario: "¡Qué pasa míster!", "Hola compañero", "A ver qué tenemos por aquí...", "Te digo una cosa...".
- Eres apasionado del fútbol y de la esencia de PES 6: conoces el valor de un desmarque letal, de la velocidad punta, del tiro con rosca y de una defensa sólida.
- Tienes conocimiento de las estadísticas de PES 6: velocidad, aceleración, potencia y precisión de tiro, equilibrio, pase y regate.
- Valoras la gestión sensata: aconsejas fichajes acordes al presupuesto del club para no hipotecar la entidad, pero siempre buscando pólvora y calidad.
- REGLA DE ORO: siempre que te pregunten por equipos, presupuestos, jugadores, mercado, clasificación o calendario, consulta los datos con las herramientas disponibles. No inventes plantillas ni precios.
- Si recomiendas futbolistas, argumenta por qué encajan tácticamente (juego a la contra, desborde por banda, etc.).
- Responde en español, con Markdown sencillo (negritas, listas o tablas cuando ayuden) y alguna pincelada de emoji futbolero sin abusar.
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

/** Modelo por defecto; se puede cambiar con ANTHROPIC_MODEL (p. ej. claude-haiku-5-5 para gastar menos). */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_TOOL_TURNS = 6;

function countResults(result: unknown): number | undefined {
  if (!result || typeof result !== "object") return undefined;
  for (const key of ["players", "teams", "standings", "matches", "transfers"]) {
    const v = (result as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v.length;
  }
  return undefined;
}

/** Conversa con David Villa usando Claude: transmite el texto y ejecuta las herramientas que pida. */
export async function* runDavidVillaAssistant(history: ChatMessage[]): AsyncGenerator<StreamEvent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    yield {
      type: "error",
      message: "Falta la variable ANTHROPIC_API_KEY. Añádela en Vercel (y en .env.local para probar en local) para hablar con David Villa.",
    };
    return;
  }

  const client = new Anthropic({ apiKey });

  // El historial que llega del navegador es texto plano; los mensajes de sistema se ignoran
  // (el carácter de David Villa va en el prompt de sistema).
  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role !== "system" && m.content.trim())
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: DAVID_VILLA_SYSTEM_PROMPT,
        tools: assistantTools,
        messages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "delta", text: event.delta.text };
        }
      }

      const message = await stream.finalMessage();
      if (message.stop_reason !== "tool_use") {
        yield { type: "done" };
        return;
      }

      // Ejecutar las herramientas pedidas y devolver los resultados a Claude.
      messages.push({ role: "assistant", content: message.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of message.content) {
        if (block.type !== "tool_use") continue;
        yield { type: "tool_start", tool: block.name, description: TOOL_DESCRIPTIONS[block.name] ?? `Consultando ${block.name}...` };
        const result = await executeTool(block.name, (block.input as Record<string, unknown>) ?? {});
        yield { type: "tool_end", tool: block.name, resultCount: countResults(result) };
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: "user", content: results });
    }

    yield { type: "done" };
  } catch (err) {
    console.error("Error en el asistente David Villa:", err);
    let message = "No he podido hablar con David Villa. Inténtalo de nuevo en un momento.";
    if (err instanceof Anthropic.AuthenticationError) message = "La clave ANTHROPIC_API_KEY no es válida.";
    else if (err instanceof Anthropic.RateLimitError) message = "Demasiadas consultas seguidas. Espera unos segundos y vuelve a preguntar.";
    else if (err instanceof Anthropic.APIError && err.status === 529) message = "Claude está saturado ahora mismo. Prueba en un minuto.";
    yield { type: "error", message };
  }
}
