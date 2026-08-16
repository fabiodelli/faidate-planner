"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 print:hidden"
    >
      🖨️ Stampa
    </button>
  );
}
