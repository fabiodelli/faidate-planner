import type { Metadata } from "next";
import Link from "next/link";
import { Chat } from "./Chat";

export const metadata: Metadata = {
  title: "Il tuo progetto — Piano fai-da-te con AI",
  description:
    "Descrivi il tuo progetto fai-da-te e ottieni piano di lavoro, materiali con quantità calcolate e costi.",
};

export default function ProgettoPage() {
  return (
    <>
      <header className="flex h-16 items-center border-b border-zinc-200 px-4">
        <Link href="/" className="font-bold text-emerald-700">
          🛠️ FaiDaTe Planner
        </Link>
      </header>
      <Chat />
    </>
  );
}
