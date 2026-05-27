import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Levers & couchers de soleil — Provence, Pays Basque, Paris",
  description:
    "Prédiction quotidienne de la beauté des levers et couchers de soleil à Coudoux, Corbières-en-Provence, Jonquerettes, Sare et Paris.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
