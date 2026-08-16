// Setup del database: applica lo schema e carica knowledge base materiali
// + catalogo prodotti demo. Idempotente.
// Uso: npm run db:setup

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

interface MaterialRow {
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

interface SampleProductRow {
  external_id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image_url: string | null;
  deeplink: string;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL non configurato (.env). Interrotto.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("✓ Schema applicato");

  const materials = JSON.parse(
    readFileSync(join(process.cwd(), "src", "lib", "data", "materials.json"), "utf8")
  ) as MaterialRow[];

  for (const m of materials) {
    await pool.query(
      `INSERT INTO materials (slug, name, category, material_unit, work_unit,
         consumption_min, consumption_max, passes_default, waste_factor, packages, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name, category = EXCLUDED.category,
         material_unit = EXCLUDED.material_unit, work_unit = EXCLUDED.work_unit,
         consumption_min = EXCLUDED.consumption_min, consumption_max = EXCLUDED.consumption_max,
         passes_default = EXCLUDED.passes_default, waste_factor = EXCLUDED.waste_factor,
         packages = EXCLUDED.packages, notes = EXCLUDED.notes`,
      [
        m.slug, m.name, m.category, m.material_unit, m.work_unit,
        m.consumption_min, m.consumption_max, m.passes_default, m.waste_factor,
        JSON.stringify(m.packages ?? []), m.notes,
      ]
    );
  }
  console.log(`✓ ${materials.length} materiali caricati`);

  const products = JSON.parse(
    readFileSync(join(process.cwd(), "src", "lib", "data", "sample-products.json"), "utf8")
  ) as SampleProductRow[];

  for (const p of products) {
    await pool.query(
      `INSERT INTO products (external_id, name, category, brand, price, image_url, deeplink, is_sample)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (external_id) DO UPDATE SET
         name = EXCLUDED.name, category = EXCLUDED.category, brand = EXCLUDED.brand,
         price = EXCLUDED.price, image_url = EXCLUDED.image_url,
         deeplink = EXCLUDED.deeplink, updated_at = now()`,
      [p.external_id, p.name, p.category, p.brand, p.price, p.image_url, p.deeplink]
    );
  }
  console.log(`✓ ${products.length} prodotti demo caricati (is_sample=true)`);
  console.log("Setup completato. Quando il feed Awin è attivo: npm run feed:import -- <file.csv>");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
