import { customAlphabet } from "nanoid";
import type { Plan, StoredPlan } from "@/lib/plan-schema";
import { hasDb, query } from "@/lib/db";

const nanoid = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 10);

// Fallback in-memory per sviluppo senza DB (i piani si perdono al riavvio).
const globalForPlans = globalThis as unknown as { planStore?: Map<string, StoredPlan> };
function memStore(): Map<string, StoredPlan> {
  if (!globalForPlans.planStore) globalForPlans.planStore = new Map();
  return globalForPlans.planStore;
}

export async function savePlan(plan: Plan): Promise<StoredPlan> {
  const slug = nanoid();
  const stored: StoredPlan = {
    slug,
    title: plan.title,
    plan,
    created_at: new Date().toISOString(),
  };

  if (hasDb()) {
    await query(
      `INSERT INTO plans (slug, title, plan) VALUES ($1, $2, $3)`,
      [slug, plan.title, JSON.stringify(plan)]
    );
  } else {
    console.warn("plan-store: DATABASE_URL assente, piano salvato solo in memoria");
    memStore().set(slug, stored);
  }
  return stored;
}

export async function getPlan(slug: string): Promise<StoredPlan | null> {
  if (hasDb()) {
    const rows = await query<{ slug: string; title: string; plan: Plan; created_at: string }>(
      `SELECT slug, title, plan, created_at FROM plans WHERE slug = $1`,
      [slug]
    );
    if (rows.length === 0) return null;
    return rows[0] as StoredPlan;
  }
  return memStore().get(slug) ?? null;
}
