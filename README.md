# FaiDaTe Planner — AI DIY Project Planner

Web app con chat aperta: descrivi un obiettivo fai-da-te ("voglio tinteggiare il
soggiorno") e ottieni un piano di lavoro a fasi, la lista materiali con **quantità
calcolate in modo deterministico** (mai stimate dall'LLM), prodotti reali del
catalogo Leroy Merlin con link affiliati, costi in tre varianti e una **pagina
piano condivisibile e stampabile**.

Le regole di progetto per chi ci lavora sono in [AGENTS.md](AGENTS.md).

## Stack

- **Next.js (App Router) + TypeScript + Tailwind** — monolite frontend + API
- **Claude API** (`claude-sonnet-4-6`) con tool use come motore conversazionale
- **PostgreSQL** (Neon) — knowledge base materiali, indice prodotti, piani, eventi
- **Vercel** per l'hosting

## Architettura: l'LLM orchestra, il codice calcola

Il modello ha 5 tool ([src/lib/tools/](src/lib/tools/)):

| Tool | Cosa fa |
|---|---|
| `material_specs` | Lookup consumi/rese su knowledge base locale (~80 materiali, [materials.json](src/lib/data/materials.json)) |
| `calc_quantity` | Aritmetica pura: geometria + consumo → quantità e confezioni, con formula trasparente |
| `product_search` | Full-text search sull'indice locale dei prodotti (feed Awin importato in Postgres) |
| `risk_check` | Classificazione deterministica del rischio normativo (elettrico, gas, strutturale…) → flag professionista |
| `save_plan` | Salva il piano strutturato e restituisce l'URL pubblico |

Il loop conversazionale con streaming è in
[src/app/api/chat/route.ts](src/app/api/chat/route.ts).

## Avvio locale

```bash
cp .env.example .env    # inserisci ANTHROPIC_API_KEY
npm install
npm run dev             # http://localhost:3000
```

**Senza `DATABASE_URL` l'app funziona comunque**: usa la knowledge base e un
catalogo prodotti demo bundled, e salva i piani in memoria (persi al riavvio).
Per la modalità completa crea un DB su [Neon](https://neon.tech) e:

```bash
npm run db:setup        # schema + materiali + prodotti demo
```

## Feed prodotti Awin

1. La landing (`/`) è il requisito per la candidatura publisher Awin — farla
   prima, su dominio proprio.
2. Doppia approvazione: prima Awin, poi il programma Leroy Merlin IT.
3. Quando il feed è attivo:

```bash
npm run feed:import -- <file.csv | URL del feed>
```

L'import rimuove il catalogo demo, aggiorna i prezzi e marca out-of-stock i
prodotti spariti dal feed.

**Aggiornamento schedulato:** su Vercel il cron in [vercel.json](vercel.json)
chiama `/api/cron/import-feed` ogni notte (4:30 UTC). Richiede le env
`AWIN_FEED_URL` e `CRON_SECRET` (Vercel autentica la chiamata con
`Authorization: Bearer $CRON_SECRET`).

## Pagine e API

| Rotta | Descrizione |
|---|---|
| `/` | Landing (anche per candidatura Awin) |
| `/progetto` | Chat |
| `/plan/[slug]` | Piano pubblico: checklist, materiali, prodotti, costi, stampabile |
| `POST /api/chat` | Loop conversazionale streaming (NDJSON) |
| `GET /api/go` | Redirect affiliato con tracking click |
| `POST /api/track` | Eventi client (`chat_started`) |

## Dati tracciati (per il pitch B2B)

Tabella `events`: `plan_generated` (con costo carrello medio), `affiliate_click`,
`chat_started`. Query di esempio:

```sql
SELECT type, count(*), avg((payload->>'cost_mid')::numeric) FILTER (WHERE type='plan_generated')
FROM events GROUP BY type;
```

## Deploy (Vercel + Neon)

1. Push su GitHub → importa in Vercel.
2. Env su Vercel: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_BASE_URL`.
3. `npm run db:setup` una volta contro il DB di produzione.

## Fuori scope v1 (disciplina)

Account utente, lato professionisti, multi-retailer/paese, app mobile, pannello
admin, RAG semantico.
