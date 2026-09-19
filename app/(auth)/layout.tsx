import Link from 'next/link';

export const dynamic = 'force-dynamic'; // força render dinâmico
export const revalidate = 0;            // não revalida (sem SSG)
export const fetchCache = 'default-no-store';

/**
 * A casca das telas de entrada.
 *
 * Este layout era um `<>{children}</>` — não punha nada. O resultado é que as
 * seis telas de auth ficavam com um cartão flutuando num campo vazio: sem
 * marca, sem rodapé e sem nenhum caminho de volta. Quem recebe "entra no VIU"
 * e cai aqui não vê o nome do produto em lugar nenhum da página.
 *
 * O login tinha um escape, e ele era pior que nenhum: um `router.back()`. Numa
 * aba nova — link de e-mail, favorito, endereço digitado — não há histórico
 * para voltar, e o botão levava a `about:blank`. Uma tela em branco como saída
 * de emergência.
 *
 * Aqui a marca é o caminho de volta, que é como a web inteira funciona: clicar
 * no nome leva para a home. Sempre existe, não depende de histórico, e de
 * quebra responde "que site é este?".
 *
 * Sem "Entrar" e "Criar conta" no topo, ao contrário do `SiteHeader` da
 * landing: nestas telas um deles apontaria para a página onde a pessoa já
 * está, e o outro competiria com o botão do formulário — que é o único cheio
 * da tela, e precisa continuar sendo.
 *
 * Centralizar é do layout agora. As seis páginas repetiam
 * `flex items-center justify-center min-h-screen` por conta própria, catorze
 * vezes ao todo, porque não havia onde isso morar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="VIU — página inicial"
          >
            <span aria-hidden className="size-6 rounded-md bg-primary" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">VIU</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-14 max-w-6xl flex-wrap items-center justify-between gap-x-4 px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} VIU</span>
          <Link href="/termos" className="underline-offset-4 hover:underline">
            Termos de uso
          </Link>
        </div>
      </footer>
    </div>
  );
}
