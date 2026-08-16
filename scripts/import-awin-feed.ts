// Import manuale del datafeed Awin (Leroy Merlin IT) in Postgres.
// Uso: npm run feed:import -- <percorso-file.csv | URL>
// Per l'aggiornamento schedulato vedi /api/cron/import-feed (cron Vercel).

import "dotenv/config";
import { importAwinFeed } from "../src/lib/feed-import";

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error("Uso: npm run feed:import -- <file.csv | URL>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL non configurato (.env). Interrotto.");
    process.exit(1);
  }

  const res = await importAwinFeed(source, console.log);
  console.log(`✓ Import completato: ${res.imported} prodotti (${res.skipped} righe scartate)`);
  console.log(
    `✓ ${res.demoRemoved} prodotti demo rimossi, ${res.markedOutOfStock} prodotti marcati out of stock`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
