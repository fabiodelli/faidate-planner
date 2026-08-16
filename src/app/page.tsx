import Link from "next/link";

// Landing page: serve anche come URL della piattaforma per la candidatura
// publisher Awin (requisito prima dell'approvazione del programma).

const STEPS = [
  {
    icon: "💬",
    title: "Descrivi l'obiettivo",
    text: "“Voglio tinteggiare il soggiorno”, “voglio costruire una staccionata” — qualsiasi progetto, con parole tue.",
  },
  {
    icon: "📐",
    title: "Quantità calcolate, non stimate",
    text: "L'AI fa le domande giuste (misure, stato, budget) e calcola litri, kg e confezioni con formule deterministiche, non a occhio.",
  },
  {
    icon: "🛒",
    title: "Prodotti reali e costi chiari",
    text: "Ogni materiale è collegato a prodotti veri con prezzo aggiornato, in tre varianti: economica, consigliata e premium.",
  },
  {
    icon: "📋",
    title: "Un piano che puoi usare davvero",
    text: "Fasi passo-passo con checklist, lista della spesa completa, pagina condivisibile e stampabile da portare in negozio.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="flex h-16 items-center justify-between px-6">
        <span className="font-bold text-emerald-700">🛠️ FaiDaTe Planner</span>
        <Link
          href="/progetto"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Inizia ora
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Dal tuo obiettivo fai-da-te
          <br />
          al <span className="text-emerald-600">piano completo</span> in pochi minuti
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-600">
          Descrivi cosa vuoi realizzare. Ricevi un piano di lavoro a fasi, la lista
          materiali con le quantità esatte e i prodotti giusti al prezzo giusto.
        </p>
        <Link
          href="/progetto"
          className="mt-8 inline-block rounded-xl bg-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-emerald-700"
        >
          Descrivi il tuo progetto →
        </Link>
        <p className="mt-3 text-sm text-zinc-400">Gratis, senza registrazione.</p>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-zinc-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold">Sicurezza prima di tutto</h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-600">
          Se il tuo progetto tocca impianti elettrici, gas o parti strutturali, il
          piano te lo segnala chiaramente e ti indica quando serve un professionista
          abilitato. Niente consigli pericolosi.
        </p>
      </section>

      <footer className="border-t border-zinc-100 px-6 py-8 text-center text-xs text-zinc-400">
        <p>
          I piani sono generati con l&apos;aiuto di un&apos;AI e possono contenere errori:
          verifica sempre quantità e istruzioni. Per lavori regolamentati rivolgiti a
          professionisti abilitati.
        </p>
        <p className="mt-2">
          Alcuni link ai prodotti sono link affiliati: se acquisti, potremmo ricevere
          una commissione senza costi aggiuntivi per te.
        </p>
      </footer>
    </main>
  );
}
