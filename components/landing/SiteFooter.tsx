'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Só links que levam a algum lugar.
 *
 * O rodapé anterior tinha Sobre, Blog, Carreiras e Contato apontando para
 * `href="#"` — quatro promessas que não iam a lugar nenhum. Voltam quando as
 * páginas existirem.
 */
export default function SiteFooter() {
  const { user } = useAuth()
  const autenticado = !!user

  const produto = [
    { rotulo: 'Projetos', href: autenticado ? '/projetos' : '/login' },
    { rotulo: 'Artes', href: autenticado ? '/artes' : '/login' },
    { rotulo: 'Feedbacks', href: autenticado ? '/feedbacks' : '/login' },
  ]

  const conta = autenticado
    ? [
        { rotulo: 'Dashboard', href: '/dashboard' },
        { rotulo: 'Perfil', href: '/perfil' },
        { rotulo: 'Configurações', href: '/configuracoes' },
      ]
    : [
        { rotulo: 'Entrar', href: '/login' },
        { rotulo: 'Criar conta', href: '/cadastro' },
      ]

  return (
    <footer className="border-t border-border/60 px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="size-5 rounded bg-primary" />
              <span className="font-semibold tracking-[-0.02em]">VIU</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Revisão e aprovação de design, do primeiro rascunho ao aceite formal.
            </p>
          </div>

          <div className="flex gap-16">
            <nav aria-label="Produto">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Produto
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {produto.map(({ rotulo, href }) => (
                  <li key={rotulo}>
                    <Link href={href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Conta">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Conta
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {conta.map(({ rotulo, href }) => (
                  <li key={rotulo}>
                    <Link href={href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <p className="mt-14 border-t border-border/60 pt-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} VIU. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
