import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlan } from "@/lib/plan-store";
import { STANDARD_DISCLAIMER } from "@/lib/tools/risk-check";
import type { PlanMaterial, ProductRef } from "@/lib/plan-schema";
import { Checklist } from "./Checklist";
import { PrintButton } from "./PrintButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stored = await getPlan(slug);
  return {
    title: stored ? `${stored.title} — Piano fai-da-te` : "Piano non trovato",
    description: stored?.plan.summary,
  };
}

function euro(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function ProductLink({
  p,
  label,
  slug,
  highlight,
}: {
  p: ProductRef | null | undefined;
  label: string;
  slug: string;
  highlight?: boolean;
}) {
  if (!p) return null;
  const href = p.deeplink
    ? `/api/go?url=${encodeURIComponent(p.deeplink)}&plan=${slug}${p.id ? `&pid=${p.id}` : ""}`
    : undefined;
  const inner = (
    <span className={`block rounded-lg border p-2 text-sm ${highlight ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="block leading-snug">{p.name}</span>
      <span className="font-semibold">{euro(p.price)}</span>
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener sponsored" className="hover:opacity-80">
      {inner}
    </a>
  ) : (
    inner
  );
}

function MaterialRow({ m, slug }: { m: PlanMaterial; slug: string }) {
  return (
    <div className="border-b border-zinc-100 py-4 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{m.name}</span>
        <span className="text-sm text-zinc-600">
          {m.quantity} {m.unit}
          {m.packages ? ` · ${m.packages} conf.${m.package_size ? ` da ${m.package_size}` : ""}` : ""}
        </span>
      </div>
      {m.calculation && (
        <p className="mt-1 text-xs text-zinc-400 print:text-zinc-500">Calcolo: {m.calculation}</p>
      )}
      {m.products && (m.products.eco || m.products.mid || m.products.premium) && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <ProductLink p={m.products.eco} label="Economica" slug={slug} />
          <ProductLink p={m.products.mid} label="Consigliata" slug={slug} highlight />
          <ProductLink p={m.products.premium} label="Premium" slug={slug} />
        </div>
      )}
    </div>
  );
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stored = await getPlan(slug);
  if (!stored) notFound();
  const plan = stored.plan;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:py-2">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Piano fai-da-te
          </p>
          <h1 className="text-3xl font-bold leading-tight">{plan.title}</h1>
          <p className="mt-2 text-zinc-600">{plan.summary}</p>
          <p className="mt-2 text-sm text-zinc-500">
            Difficoltà: {"●".repeat(plan.difficulty)}{"○".repeat(Math.max(0, 5 - plan.difficulty))}
            {" · "}Tempo stimato: {plan.estimated_time}
            {" · "}Creato il {new Date(stored.created_at).toLocaleDateString("it-IT")}
          </p>
        </div>
        <PrintButton />
      </div>

      {(plan.risk.requires_professional || plan.risk.flags.length > 0) && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            {plan.risk.requires_professional
              ? "⚠️ Parti di questo progetto richiedono un professionista abilitato"
              : "⚠️ Attenzione"}
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {plan.risk.flags.map((f, i) => (
              <li key={i}>
                <span className="font-medium capitalize">{f.category}:</span> {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Fasi di lavoro</h2>
        <Checklist
          storageKey={`plan-${slug}`}
          items={plan.phases.map((ph) => ({
            id: `phase-${ph.n}`,
            title: `${ph.n}. ${ph.title}${ph.duration ? ` (${ph.duration})` : ""}`,
            description: ph.description,
          }))}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-xl font-bold">Materiali</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Quantità calcolate sulle misure fornite, scarto incluso. I link portano al negozio.
        </p>
        <div className="rounded-xl border border-zinc-200 px-4">
          {plan.materials.map((m, i) => (
            <MaterialRow key={i} m={m} slug={slug} />
          ))}
        </div>
      </section>

      {plan.tools.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold">Attrezzi</h2>
          <div className="rounded-xl border border-zinc-200 px-4">
            {plan.tools.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 py-3 last:border-0">
                <span>
                  {t.name}
                  {t.optional && <span className="ml-2 text-xs text-zinc-400">(se non lo possiedi già)</span>}
                </span>
                {t.product && (
                  <div className="w-full sm:w-64">
                    <ProductLink p={t.product} label="Proposta" slug={slug} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Costo stimato</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Economico", plan.cost.eco, false],
              ["Consigliato", plan.cost.mid, true],
              ["Premium", plan.cost.premium, false],
            ] as const
          ).map(([label, value, hl]) => (
            <div
              key={label}
              className={`rounded-xl border p-4 text-center ${hl ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"}`}
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="text-2xl font-bold">{euro(value)}</p>
            </div>
          ))}
        </div>
      </section>

      {plan.notes && (
        <section className="mb-8">
          <h2 className="mb-2 text-xl font-bold">Note</h2>
          <p className="text-zinc-600">{plan.notes}</p>
        </section>
      )}

      <footer className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-400">
        {STANDARD_DISCLAIMER} I link ai prodotti possono essere link affiliati.
      </footer>
    </main>
  );
}
