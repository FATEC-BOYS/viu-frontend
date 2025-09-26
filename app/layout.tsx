import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../components/ui/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Viu - Sistema de Gestão",
  description: "Sistema de gestão de projetos de design",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
<html lang="pt-BR">
  <body data-skin="viu-cyber">{children}</body>
</html>

  );
}
