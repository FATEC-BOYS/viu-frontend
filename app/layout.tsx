// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Providers from "../components/ui/providers";

// `variable` alimenta o --font-sans do @theme: sem isso a fonte só existia na
// classe do body, e qualquer elemento com `font-sans` caía fora da Inter.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "VIU — revisão e aprovação de design",
  description:
    "Envie artes, receba feedback no ponto exato e feche a aprovação com o cliente — sem caçar comentário em thread de e-mail.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
