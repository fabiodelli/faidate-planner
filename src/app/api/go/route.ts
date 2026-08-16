// Redirect affiliato con tracking del click.
// Uso: /api/go?url=<deeplink>&plan=<slug>&pid=<product_id>

import { trackEvent } from "@/lib/events";

export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  "www.leroymerlin.it",
  "leroymerlin.it",
  "www.awin1.com", // deeplink Awin
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const plan = searchParams.get("plan");
  const pid = searchParams.get("pid");

  if (!url) return Response.json({ error: "url mancante" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return Response.json({ error: "url non valido" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.includes(target.hostname)) {
    return Response.json({ error: "destinazione non consentita" }, { status: 400 });
  }

  await trackEvent("affiliate_click", plan, { pid, url: target.href });
  return Response.redirect(target.href, 302);
}
