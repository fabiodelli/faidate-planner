// Tracking eventi minimale (serve per il pitch B2B: piani generati,
// valore carrello medio, click affiliati). Nessuna analytics complessa.

import { hasDb, query } from "@/lib/db";

export type EventType = "plan_generated" | "affiliate_click" | "chat_started";

export async function trackEvent(
  type: EventType,
  planSlug?: string | null,
  payload?: Record<string, unknown>
): Promise<void> {
  if (!hasDb()) {
    console.log(`[event] ${type}`, planSlug ?? "", payload ?? "");
    return;
  }
  try {
    await query(
      `INSERT INTO events (type, plan_slug, payload) VALUES ($1, $2, $3)`,
      [type, planSlug ?? null, payload ? JSON.stringify(payload) : null]
    );
  } catch (err) {
    // Il tracking non deve mai rompere il flusso utente.
    console.error("trackEvent fallito", err);
  }
}
