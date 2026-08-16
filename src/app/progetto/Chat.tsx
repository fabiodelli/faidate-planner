"use client";

import { useEffect, useRef, useState } from "react";

// Messaggio per la UI (solo testo visibile + attività tool).
interface UiMessage {
  role: "user" | "assistant";
  text: string;
  tools?: string[];
  planUrl?: string;
}

// La history completa per l'API (inclusi blocchi tool_use/tool_result) è
// opaca per il client: la conserviamo e la rimandiamo così com'è.
type ApiMessage = unknown;

const TOOL_LABELS: Record<string, string> = {
  calc_quantity: "Calcolo quantità…",
  material_specs: "Consulto schede materiali…",
  product_search: "Cerco prodotti nel catalogo…",
  risk_check: "Verifico i rischi…",
  save_plan: "Salvo il piano…",
};

const SUGGESTIONS = [
  "Voglio tinteggiare il soggiorno",
  "Voglio costruire una staccionata in giardino",
  "Voglio posare un pavimento in laminato in camera",
  "Voglio eliminare la muffa dalla parete del bagno",
];

export function Chat() {
  const [uiMessages, setUiMessages] = useState<UiMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    if (!startedRef.current) {
      startedRef.current = true;
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat_started" }),
      }).catch(() => {});
    }

    setError(null);
    setInput("");
    setBusy(true);
    setUiMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "assistant", text: "", tools: [] },
    ]);

    const outgoing = [...apiMessages, { role: "user", content: trimmed }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Errore ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const updateLast = (fn: (m: UiMessage) => UiMessage) =>
        setUiMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = fn(next[next.length - 1]);
          return next;
        });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as
            | { t: "text"; v: string }
            | { t: "tool"; name: string }
            | { t: "plan"; url: string; slug: string }
            | { t: "done"; messages: ApiMessage[] }
            | { t: "error"; message: string };

          if (ev.t === "text") {
            updateLast((m) => ({ ...m, text: m.text + ev.v }));
          } else if (ev.t === "tool") {
            updateLast((m) => ({
              ...m,
              tools: [...(m.tools ?? []), TOOL_LABELS[ev.name] ?? ev.name],
            }));
          } else if (ev.t === "plan") {
            updateLast((m) => ({ ...m, planUrl: ev.url }));
          } else if (ev.t === "done") {
            setApiMessages(ev.messages);
          } else if (ev.t === "error") {
            setError(ev.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete, riprova.");
      // Rimuovi il messaggio assistant vuoto se non è arrivato nulla
      setUiMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1].text
          ? prev.slice(0, -1)
          : prev
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {uiMessages.length === 0 && (
            <div className="mt-12 text-center">
              <h1 className="text-2xl font-bold">Cosa vuoi realizzare?</h1>
              <p className="mt-2 text-zinc-500">
                Descrivi il tuo progetto fai-da-te: ti farò qualche domanda e poi
                preparerò piano, materiali con quantità esatte e costi.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-emerald-500 hover:text-emerald-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {uiMessages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "border border-zinc-200 bg-white"
                }`}
              >
                {m.tools && m.tools.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {m.tools.map((t, j) => (
                      <span key={j} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.text || (m.role === "assistant" && busy && i === uiMessages.length - 1 ? "…" : m.text)}
                </div>
                {m.planUrl && (
                  <a
                    href={m.planUrl}
                    target="_blank"
                    rel="noopener"
                    className="mt-3 block rounded-xl border-2 border-emerald-500 bg-emerald-50 p-3 text-center font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    📋 Apri il tuo piano completo →
                  </a>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white p-4">
        <form
          className="mx-auto flex max-w-2xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={busy ? "Sto lavorando al tuo progetto…" : "Descrivi il tuo progetto…"}
            disabled={busy}
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-emerald-500 disabled:bg-zinc-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Invia
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-zinc-400">
          L&apos;AI può commettere errori: verifica sempre quantità e istruzioni. Per
          impianti elettrici, gas e opere strutturali servono professionisti abilitati.
        </p>
      </div>
    </div>
  );
}
