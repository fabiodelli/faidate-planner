// material_specs — lookup sulla knowledge base rese/consumi materiali.
// Con DATABASE_URL usa Postgres (full-text italiano), altrimenti il JSON bundled.

import materialsData from "@/lib/data/materials.json";
import { hasDb, query } from "@/lib/db";

export interface MaterialSpec {
  slug: string;
  name: string;
  category: string;
  material_unit: string;
  work_unit: string;
  consumption_min: number;
  consumption_max: number;
  passes_default: number;
  waste_factor: number;
  packages: number[] | null;
  notes: string | null;
}

const bundled = materialsData as MaterialSpec[];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function searchBundled(q: string, category?: string, limit = 8): MaterialSpec[] {
  const terms = normalize(q).split(/\s+/).filter((t) => t.length > 2);
  const scored = bundled
    .filter((m) => !category || m.category === category)
    .map((m) => {
      const hay = normalize(`${m.name} ${m.slug} ${m.category} ${m.notes ?? ""}`);
      let score = 0;
      for (const t of terms) {
        if (hay.includes(t)) score += 2;
        // match parziale su radici (es. "pittur" in "idropittura")
        else if (t.length > 4 && hay.includes(t.slice(0, t.length - 2))) score += 1;
      }
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.m);
}

export async function materialSpecs(input: {
  query: string;
  category?: string;
  limit?: number;
}): Promise<MaterialSpec[]> {
  const limit = Math.min(input.limit ?? 8, 20);

  if (hasDb()) {
    try {
      const rows = await query<MaterialSpec>(
        `SELECT slug, name, category, material_unit, work_unit,
                consumption_min::float, consumption_max::float,
                passes_default, waste_factor::float, packages, notes
         FROM materials
         WHERE ($2::text IS NULL OR category = $2)
           AND (search @@ plainto_tsquery('italian', $1)
                OR name ILIKE '%' || $1 || '%')
         ORDER BY ts_rank(search, plainto_tsquery('italian', $1)) DESC
         LIMIT $3`,
        [input.query, input.category ?? null, limit]
      );
      if (rows.length > 0) return rows;
    } catch (err) {
      console.error("material_specs: errore DB, uso dati bundled", err);
    }
  }
  return searchBundled(input.query, input.category, limit);
}

export function allBundledMaterials(): MaterialSpec[] {
  return bundled;
}
