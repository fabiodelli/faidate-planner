// Definizioni dei tool esposti al modello + dispatcher di esecuzione.
// Principio: l'LLM orchestra, il codice calcola.

import type Anthropic from "@anthropic-ai/sdk";
import { calcQuantity, type CalcQuantityInput } from "./calc-quantity";
import { materialSpecs } from "./material-specs";
import { productSearch, type ProductSearchInput } from "./product-search";
import { riskCheck, type RiskCheckInput } from "./risk-check";
import { savePlan } from "@/lib/plan-store";
import { trackEvent } from "@/lib/events";
import type { Plan } from "@/lib/plan-schema";

const productRefSchema = {
  type: "object",
  properties: {
    id: { type: ["integer", "null"], description: "id del prodotto restituito da product_search" },
    name: { type: "string" },
    price: { type: "number" },
    image_url: { type: ["string", "null"] },
    deeplink: { type: ["string", "null"] },
  },
  required: ["name", "price"],
} as const;

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "calc_quantity",
    description:
      "Calcola in modo deterministico la quantità di materiale necessaria e il numero di confezioni. USALO SEMPRE per ogni quantità: non stimare mai a mente. Prima recupera il consumo del materiale con material_specs, poi passa qui geometria e parametri.",
    input_schema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["direct", "rectangle", "walls", "volume", "count"],
          description:
            "direct: quantità di lavoro già nota (value). rectangle: length_m×width_m. walls: perimeter_m×height_m−openings_area_mq. volume: length_m×width_m×depth_m. count: numero elementi (value).",
        },
        value: { type: "number", description: "Per mode=direct o count" },
        length_m: { type: "number" },
        width_m: { type: "number" },
        perimeter_m: { type: "number" },
        height_m: { type: "number" },
        openings_area_mq: { type: "number", description: "Area porte/finestre da sottrarre (mq)" },
        depth_m: { type: "number", description: "Spessore/profondità in METRI per mode=volume" },
        consumption_per_unit: {
          type: "number",
          description: "Consumo di materiale per unità di lavoro, da material_specs (usa un valore tra consumption_min e consumption_max)",
        },
        passes: { type: "integer", description: "Numero di mani/passate (default 1)" },
        waste_factor: { type: "number", description: "Fattore di scarto, es. 0.1 = 10%" },
        thickness_multiplier: {
          type: "number",
          description: "Per materiali dosati 'per cm' o 'per mm' di spessore: lo spessore nella stessa unità indicata nelle note del materiale",
        },
        package_size: { type: "number", description: "Formato confezione per calcolare i pezzi da comprare" },
      },
      required: ["mode", "consumption_per_unit"],
    },
  },
  {
    name: "material_specs",
    description:
      "Cerca nella knowledge base locale i consumi/rese dei materiali (es. 'idropittura', 'colla piastrelle', 'palo staccionata'). Restituisce consumo min/max per unità di lavoro, mani consigliate, scarto e formati confezione. Usa i valori restituiti come input di calc_quantity.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nome o tipo di materiale, in italiano" },
        category: {
          type: "string",
          description: "Filtro opzionale: pittura, muratura, piastrelle, pavimenti, cartongesso, giardino, isolamento, legno, fissaggi, idraulica, decorazione, infissi, attrezzi",
        },
        limit: { type: "integer" },
      },
      required: ["query"],
    },
  },
  {
    name: "product_search",
    description:
      "Cerca prodotti reali nel catalogo locale Leroy Merlin (prezzi e link). Usalo per collegare ogni materiale e attrezzo a prodotti acquistabili. Fai più ricerche con query diverse per trovare varianti economica/media/premium.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termini di ricerca prodotto, in italiano" },
        category: { type: "string" },
        min_price: { type: "number" },
        max_price: { type: "number" },
        limit: { type: "integer" },
      },
      required: ["query"],
    },
  },
  {
    name: "risk_check",
    description:
      "Classifica il progetto per rischio normativo (elettrico, gas, strutturale, idraulico complesso, amianto, lavori in quota). CHIAMALO SEMPRE prima di generare il piano. Se un flag è blocking=true NON fornire istruzioni operative su quella parte: rimanda a un professionista.",
    input_schema: {
      type: "object",
      properties: {
        project_description: { type: "string", description: "Descrizione completa del progetto dell'utente" },
        phases: { type: "array", items: { type: "string" }, description: "Titoli/descrizioni delle fasi previste" },
      },
      required: ["project_description"],
    },
  },
  {
    name: "save_plan",
    description:
      "Salva il piano definitivo e restituisce l'URL pubblico condivisibile. Chiamalo UNA SOLA VOLTA, quando hai: fasi complete, materiali con quantità calcolate via calc_quantity, prodotti reali da product_search per le varianti eco/media/premium, risk_check eseguito e costi totali sommati dai prezzi reali.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string", description: "2-3 frasi che riassumono il progetto" },
        difficulty: { type: "integer", description: "1 (facilissimo) - 5 (esperto)" },
        estimated_time: { type: "string", description: "es. '1 weekend', '4-6 ore'" },
        risk: {
          type: "object",
          properties: {
            requires_professional: { type: "boolean" },
            flags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["category", "reason"],
              },
            },
          },
          required: ["requires_professional", "flags"],
        },
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              n: { type: "integer" },
              title: { type: "string" },
              description: { type: "string", description: "Istruzioni pratiche della fase, 2-5 frasi" },
              duration: { type: ["string", "null"] },
            },
            required: ["n", "title", "description"],
          },
        },
        materials: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number", description: "Quantità calcolata con calc_quantity" },
              unit: { type: "string" },
              packages: { type: ["integer", "null"] },
              package_size: { type: ["number", "null"] },
              calculation: { type: ["string", "null"], description: "La formula restituita da calc_quantity" },
              products: {
                type: "object",
                properties: {
                  eco: { ...productRefSchema },
                  mid: { ...productRefSchema },
                  premium: { ...productRefSchema },
                },
              },
            },
            required: ["name", "quantity", "unit"],
          },
        },
        tools: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              optional: { type: "boolean" },
              product: { ...productRefSchema },
            },
            required: ["name"],
          },
        },
        cost: {
          type: "object",
          properties: {
            eco: { type: "number" },
            mid: { type: "number" },
            premium: { type: "number" },
            currency: { type: "string" },
          },
          required: ["eco", "mid", "premium", "currency"],
        },
        notes: { type: ["string", "null"] },
      },
      required: ["title", "summary", "difficulty", "estimated_time", "risk", "phases", "materials", "tools", "cost"],
    },
  },
];

export interface ToolExecutionResult {
  result: string;
  // Presente solo per save_plan: usato per notificare il client via stream.
  planUrl?: string;
  planSlug?: string;
}

export async function executeTool(
  name: string,
  input: unknown
): Promise<ToolExecutionResult> {
  switch (name) {
    case "calc_quantity": {
      const res = calcQuantity(input as CalcQuantityInput);
      return { result: JSON.stringify(res) };
    }
    case "material_specs": {
      const res = await materialSpecs(input as { query: string; category?: string; limit?: number });
      if (res.length === 0) {
        return {
          result: JSON.stringify({
            matches: [],
            hint: "Nessun materiale trovato. Riprova con un termine più generico, oppure usa valori di consumo prudenti dichiarandolo esplicitamente all'utente.",
          }),
        };
      }
      return { result: JSON.stringify({ matches: res }) };
    }
    case "product_search": {
      const res = await productSearch(input as ProductSearchInput);
      const isDemo = res.some((p) => p.is_sample);
      return {
        result: JSON.stringify({
          products: res,
          ...(isDemo ? { note: "Catalogo demo: prezzi indicativi, il feed reale non è ancora attivo." } : {}),
        }),
      };
    }
    case "risk_check": {
      const res = riskCheck(input as RiskCheckInput);
      return { result: JSON.stringify(res) };
    }
    case "save_plan": {
      const plan = input as Plan;
      const stored = await savePlan(plan);
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      const url = `${base}/plan/${stored.slug}`;
      await trackEvent("plan_generated", stored.slug, {
        title: plan.title,
        cost_mid: plan.cost?.mid,
        materials_count: plan.materials?.length,
        requires_professional: plan.risk?.requires_professional,
      });
      return {
        result: JSON.stringify({ ok: true, url, slug: stored.slug }),
        planUrl: url,
        planSlug: stored.slug,
      };
    }
    default:
      return { result: JSON.stringify({ error: `Tool sconosciuto: ${name}` }) };
  }
}
