// Logica di import del datafeed Awin (Leroy Merlin IT), condivisa tra
// lo script manuale (scripts/import-awin-feed.ts) e il cron Vercel
// (/api/cron/import-feed).
//
// Colonne attese (formato standard Awin Product Feed):
//   aw_product_id, product_name, description, merchant_category,
//   brand_name, search_price, currency, in_stock, aw_image_url, aw_deep_link

import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { getPool } from "@/lib/db";

interface AwinRow {
  aw_product_id: string;
  product_name: string;
  description?: string;
  merchant_category?: string;
  brand_name?: string;
  search_price: string;
  currency?: string;
  in_stock?: string;
  aw_image_url?: string;
  aw_deep_link: string;
}

export interface FeedImportResult {
  imported: number;
  skipped: number;
  demoRemoved: number;
  markedOutOfStock: number;
}

async function getStream(source: string): Promise<NodeJS.ReadableStream> {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok || !res.body) throw new Error(`Download feed fallito: ${res.status}`);
    return Readable.fromWeb(res.body as import("stream/web").ReadableStream);
  }
  return createReadStream(source);
}

export async function importAwinFeed(
  source: string,
  log: (msg: string) => void = () => {}
): Promise<FeedImportResult> {
  const pool = getPool();
  const startedAt = new Date();

  const parser = (await getStream(source)).pipe(
    parse({ columns: true, skip_empty_lines: true, relax_column_count: true })
  );

  let imported = 0;
  let skipped = 0;

  for await (const record of parser) {
    const row = record as AwinRow;
    const price = parseFloat(row.search_price);
    if (!row.aw_product_id || !row.product_name || !row.aw_deep_link || !Number.isFinite(price)) {
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO products (external_id, name, description, category, brand, price,
         currency, in_stock, image_url, deeplink, is_sample, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,now())
       ON CONFLICT (external_id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description,
         category = EXCLUDED.category, brand = EXCLUDED.brand,
         price = EXCLUDED.price, currency = EXCLUDED.currency,
         in_stock = EXCLUDED.in_stock, image_url = EXCLUDED.image_url,
         deeplink = EXCLUDED.deeplink, is_sample = false, updated_at = now()`,
      [
        row.aw_product_id,
        row.product_name,
        row.description?.slice(0, 2000) ?? null,
        row.merchant_category ?? null,
        row.brand_name ?? null,
        price,
        row.currency ?? "EUR",
        row.in_stock !== "0" && row.in_stock?.toLowerCase() !== "false",
        row.aw_image_url ?? null,
        row.aw_deep_link,
      ]
    );
    imported++;
    if (imported % 1000 === 0) log(`  ${imported} prodotti importati…`);
  }

  // Rimuovi il catalogo demo ora che c'è il feed reale
  const demo = await pool.query(`DELETE FROM products WHERE is_sample = true`);
  // Prodotti spariti dal feed: marca out of stock (non cancellare: i piani li referenziano)
  const stale = await pool.query(
    `UPDATE products SET in_stock = false WHERE is_sample = false AND updated_at < $1`,
    [startedAt]
  );

  return {
    imported,
    skipped,
    demoRemoved: demo.rowCount ?? 0,
    markedOutOfStock: stale.rowCount ?? 0,
  };
}
