// product_search — ricerca sull'indice locale dei prodotti (feed Awin importato
// in Postgres). Mai chiamate API esterne in tempo reale durante la chat.
// Senza DATABASE_URL usa il catalogo demo bundled.

import sampleProducts from "@/lib/data/sample-products.json";
import { hasDb, query } from "@/lib/db";

export interface Product {
  id: number;
  name: string;
  category: string | null;
  brand: string | null;
  price: number;
  image_url: string | null;
  deeplink: string;
  is_sample: boolean;
}

interface SampleProduct {
  external_id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image_url: string | null;
  deeplink: string;
}

const bundled = (sampleProducts as SampleProduct[]).map((p, i) => ({
  id: -(i + 1), // id negativi = prodotto demo non persistito
  name: p.name,
  category: p.category,
  brand: p.brand,
  price: p.price,
  image_url: p.image_url,
  deeplink: p.deeplink,
  is_sample: true,
})) satisfies Product[];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function searchBundled(input: ProductSearchInput): Product[] {
  const terms = normalize(input.query).split(/\s+/).filter((t) => t.length > 1);
  return bundled
    .filter(
      (p) =>
        (!input.category || p.category === input.category) &&
        (input.min_price == null || p.price >= input.min_price) &&
        (input.max_price == null || p.price <= input.max_price)
    )
    .map((p) => {
      const hay = normalize(`${p.name} ${p.category} ${p.brand}`);
      let score = 0;
      for (const t of terms) {
        if (hay.includes(t)) score += 2;
        else if (t.length > 4 && hay.includes(t.slice(0, t.length - 2))) score += 1;
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(input.limit ?? 8, 20))
    .map((x) => x.p);
}

export interface ProductSearchInput {
  query: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
}

export async function productSearch(input: ProductSearchInput): Promise<Product[]> {
  const limit = Math.min(input.limit ?? 8, 20);

  if (hasDb()) {
    try {
      const rows = await query<Product>(
        `SELECT id, name, category, brand, price::float, image_url, deeplink, is_sample
         FROM products
         WHERE in_stock
           AND ($2::text IS NULL OR category ILIKE '%' || $2 || '%')
           AND ($3::numeric IS NULL OR price >= $3)
           AND ($4::numeric IS NULL OR price <= $4)
           AND (search @@ plainto_tsquery('italian', $1)
                OR name ILIKE '%' || $1 || '%')
         ORDER BY ts_rank(search, plainto_tsquery('italian', $1)) DESC, price ASC
         LIMIT $5`,
        [input.query, input.category ?? null, input.min_price ?? null, input.max_price ?? null, limit]
      );
      if (rows.length > 0) return rows;
    } catch (err) {
      console.error("product_search: errore DB, uso catalogo demo", err);
    }
  }
  return searchBundled(input);
}
