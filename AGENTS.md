<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FaiDaTe Planner — guida per agenti

**Se nella working copy c'e' PROJECT_SEED.md, leggilo prima: contiene le decisioni
strategiche gia' prese, non ridiscuterle salvo problemi tecnici concreti. Non e'
versionato di proposito (resta in locale), quindi in un clone pulito non c'e': in
quel caso le regole qui sotto sono l'unica fonte.**

## Regole non negoziabili

- **L'LLM orchestra, il codice calcola.** Ogni quantita' di materiale passa da
  `material_specs` -> `calc_quantity`. Mai quantita' stimate a testo libero dal modello.
- **Modello runtime prodotto:** `claude-sonnet-4-6` (deciso nel seed, hardcoded in
  `src/app/api/chat/route.ts`). Non cambiarlo senza richiesta esplicita.
- **Niente consigli operativi** su elettrico, gas, strutturale, amianto: solo flag
  professionista via `risk_check` (regole in `src/lib/tools/risk-check.ts`).
- **Fuori scope v1:** account utente, multi-retailer/paese, app mobile, pannello
  admin, RAG/vector DB.

## Architettura

- `src/lib/tools/` — i 5 tool del modello (definizioni + dispatcher in `index.ts`)
- `src/lib/data/materials.json` — knowledge base consumi (~80 voci). Unica fonte:
  il DB viene seedato da qui (`npm run db:setup`). Per aggiungere materiali,
  modifica il JSON e riesegui il setup.
- `src/lib/data/sample-products.json` — catalogo demo finche' il feed Awin non e'
  attivo; rimosso automaticamente da `npm run feed:import`.
- `src/app/api/chat/route.ts` — loop conversazionale, streaming NDJSON
  (`{t:"text"|"tool"|"plan"|"done"|"error"}`). Il client rimanda la history
  completa (con blocchi tool) a ogni turno: API stateless.
- **Fallback senza DB:** con `DATABASE_URL` assente tutto funziona con i dati
  bundled e i piani in memoria. Non rompere questo percorso: e' la modalita' demo.

## Comandi

- `npm run dev` — sviluppo
- `npm run build` — verifica sempre prima di chiudere un task
- `npm run db:setup` — schema + seed (richiede DATABASE_URL)
- `npm run feed:import -- <csv|url>` — import feed Awin manuale

## Pendenze esterne

Chiave API Anthropic, DB Neon, approvazione Awin/Leroy Merlin (bloccante per
prodotti reali), nome/dominio, deploy Vercel. Dettagli nel README.
