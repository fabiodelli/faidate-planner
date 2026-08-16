// Aggiornamento schedulato del feed prodotti (cron Vercel, vedi vercel.json).
// Richiede: AWIN_FEED_URL (URL del datafeed CSV da Awin) e CRON_SECRET.
// Vercel invia automaticamente "Authorization: Bearer <CRON_SECRET>".

import { hasDb } from "@/lib/db";
import { importAwinFeed } from "@/lib/feed-import";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "non autorizzato" }, { status: 401 });
  }
  if (!hasDb()) {
    return Response.json({ error: "DATABASE_URL non configurato" }, { status: 500 });
  }
  const feedUrl = process.env.AWIN_FEED_URL;
  if (!feedUrl) {
    return Response.json(
      { error: "AWIN_FEED_URL non configurato (in attesa di approvazione Awin?)" },
      { status: 500 }
    );
  }

  try {
    const res = await importAwinFeed(feedUrl, (m) => console.log("[cron feed]", m));
    console.log("[cron feed] completato", res);
    return Response.json({ ok: true, ...res });
  } catch (err) {
    console.error("[cron feed] fallito", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "import fallito" },
      { status: 500 }
    );
  }
}
