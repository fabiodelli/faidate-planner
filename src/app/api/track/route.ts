import { trackEvent, type EventType } from "@/lib/events";

export const runtime = "nodejs";

const ALLOWED: EventType[] = ["chat_started"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { type?: EventType; payload?: Record<string, unknown> };
    if (!body.type || !ALLOWED.includes(body.type)) {
      return Response.json({ error: "tipo evento non consentito" }, { status: 400 });
    }
    await trackEvent(body.type, null, body.payload);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "body non valido" }, { status: 400 });
  }
}
