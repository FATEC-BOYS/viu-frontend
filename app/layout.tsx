// app/layout.tsx
import Script from "next/script";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Providers from "../components/ui/providers";

// `variable` alimenta o --font-sans do @theme: sem isso a fonte só existia na
// classe do body, e qualquer elemento com `font-sans` caía fora da Inter.
// Fontes versionadas no lockfile: o build não depende de acesso ao Google.
const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter', weight: '100 900', display: 'swap',
});

/**
 * Face de display, usada só nos títulos da landing page.
 *
 * O produto continua inteiro em Inter — trocar a fonte da interface por causa
 * do site seria mexer no que já está resolvido. A vitrine pode ter voz
 * própria: quem chega no site está sendo convencido, quem está no app está
 * trabalhando.
 */
const bricolage = localFont({
  src: '../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  variable: '--font-display', weight: '200 800', display: 'swap',
});

export const metadata: Metadata = {
  title: "VIU — revisão e aprovação de design",
  description:
    "Envie artes, receba feedback no ponto exato e feche a aprovação com o cliente — sem caçar comentário em thread de e-mail.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
        {process.env.VERCEL_ENV === "production" && (
          <Script
            id="cloudflare-web-analytics"
            type="module"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: "98c336d590eb4057aee5a064800d2efd" })}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
