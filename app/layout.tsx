// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Viu - Sistema de Gestão",
  description: "Sistema de gestão de projetos de design",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className} data-skin="viu-cyber">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
