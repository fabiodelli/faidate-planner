// Loop conversazionale: streaming NDJSON verso il client + tool loop server-side.
// Il client conserva la history completa (inclusi i blocchi tool_use/tool_result)
// e la rimanda a ogni turno: l'API resta stateless.

import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions, executeTool } from "@/lib/tools";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-sonnet-4-6"; // deciso nel PROJECT_SEED per il runtime prodotto
const MAX_ITERATIONS = 12;
const MAX_MESSAGES = 80;

type StreamEvent =
  | { t: "text"; v: string }
  | { t: "tool"; name: string }
  | { t: "plan"; url: string; slug: string }
  | { t: "done"; messages: Anthropic.MessageParam[] }
  | { t: "error"; message: string };

export async function POST(req: Request) {
  let body: { messages?: Anthropic.MessageParam[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const incoming = body.messages;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_MESSAGES) {
    return Response.json({ error: "messages mancante o non valido" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY non configurata sul server" },
      { status: 500 }
    );
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (ev: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));

      const messages: Anthropic.MessageParam[] = [...incoming];

      try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const msgStream = client.messages.stream({
            model: MODEL,
            max_tokens: 8192,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: toolDefinitions,
            messages,
          });

          msgStream.on("text", (delta) => emit({ t: "text", v: delta }));

          const response = await msgStream.finalMessage();
          messages.push({ role: "assistant", content: response.content });

          if (response.stop_reason === "pause_turn") {
            continue;
          }

          if (response.stop_reason === "tool_use") {
            const toolUses = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );
            const results: Anthropic.ToolResultBlockParam[] = [];
            for (const tu of toolUses) {
              emit({ t: "tool", name: tu.name });
              try {
                const res = await executeTool(tu.name, tu.input);
                if (res.planUrl && res.planSlug) {
                  emit({ t: "plan", url: res.planUrl, slug: res.planSlug });
                }
                results.push({
                  type: "tool_result",
                  tool_use_id: tu.id,
                  content: res.result,
                });
              } catch (err) {
                results.push({
                  type: "tool_result",
                  tool_use_id: tu.id,
                  content: `Errore: ${err instanceof Error ? err.message : String(err)}`,
                  is_error: true,
                });
              }
            }
            messages.push({ role: "user", content: results });
            continue;
          }

          // end_turn, max_tokens, refusal...: chiudi il turno
          break;
        }

        emit({ t: "done", messages });
      } catch (err) {
        console.error("Errore chat", err);
        emit({
          t: "error",
          message:
            err instanceof Anthropic.APIError
              ? `Errore API (${err.status}): riprova tra poco.`
              : "Errore imprevisto: riprova.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
