import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FaiDaTe Planner — Dal tuo obiettivo al piano completo",
  description:
    "Descrivi il tuo progetto fai-da-te e ottieni un piano di lavoro a fasi, la lista materiali con quantità calcolate e i prodotti giusti al prezzo giusto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        {children}
      </body>
    </html>
  );
}
