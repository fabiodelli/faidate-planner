"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string;
  title: string;
  description: string;
}

// Checklist con stato persistito in localStorage (nessun account nel v1).
export function Checklist({ storageKey, items }: { storageKey: string; items: Item[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      // localStorage non disponibile: la checklist funziona senza persistenza
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignora
    }
  };

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className={`rounded-xl border p-4 transition ${
            done[item.id] ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={Boolean(done[item.id])}
              onChange={() => toggle(item.id)}
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-600 print:hidden"
            />
            <span>
              <span className={`font-semibold ${done[item.id] ? "text-zinc-400 line-through" : ""}`}>
                {item.title}
              </span>
              <span className="mt-1 block text-sm text-zinc-600">{item.description}</span>
            </span>
          </label>
        </li>
      ))}
    </ol>
  );
}
