'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, ArrowDownToLine, ArrowRight, Loader2, RefreshCw, ScaleIcon, Users,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { FadeIn } from '@/components/layout/Motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi, type ResumoAdmin } from '@/lib/admin'

/**
 * Home do admin: dá para responder em dez segundos "tem gente nova? tem fila?
 * o funil anda?".
 *
 * Mora dentro de `app/(dashboard)/admin`, então herda o mesmo shell do resto
 * do app e a barreira de papel do `admin/layout.tsx` — nada de painel
 * separado. Quem protege de verdade continua sendo o `requireRole('ADMIN')`
 * do backend.
 */

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})

function quando(iso: string) {
  return FORMATO_DATA.format(new Date(iso))
}

/**
 * `null` vira "—", e não 0.
 *
 * A diferença importa: 0 é uma medição ("nada aconteceu"), "—" é a ausência
 * de medição. Mostrar zero para o que não sabemos medir seria mentir com
 * aparência de dado.
 */
function numero(valor: number | null) {
  return valor === null ? '—' : valor.toLocaleString('pt-BR')
}

function Metrica({ rotulo, valor, nota }: { rotulo: string; valor: number | null; nota?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-2xl font-semibold tabular-nums">{numero(valor)}</p>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      {nota && <p className="text-[11px] text-muted-foreground/80">{nota}</p>}
    </div>
  )
}

/** Número clicável: o admin vê "2 saques" e vai direto para a fila deles. */
function Atalho({ rotulo, valor, href, icone: Icone }: {
  rotulo: string; valor: number; href: string; icone: typeof Users
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <Icone className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm">{rotulo}</span>
      </div>
      <span className="text-lg font-semibold tabular-nums">{valor.toLocaleString('pt-BR')}</span>
    </Link>
  )
}

export default function AdminHomePage() {
  const [resumo, setResumo] = useState<ResumoAdmin | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const res = await adminApi.resumo()
      setResumo(res.data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o resumo.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (carregando && !resumo) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="mx-auto w-full max-w-7xl p-6">
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm">{erro}</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </div>
      </div>
    )
  }

  if (!resumo) return null

  const { hoje, funil, precisaDeVoce, fila, usuariosRecentes, periodo } = resumo
  const naFila = precisaDeVoce.saquesPendentes + precisaDeVoce.disputasAbertas

  return (
    <FadeIn className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Administração"
        description={`Pulso do beta · fuso ${periodo.fuso.replace('_', ' ')}`}
        actions={
          <Button size="sm" variant="outline" onClick={() => void carregar()} disabled={carregando}>
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Metrica rotulo="contas novas" valor={hoje.contasNovas} />
            <Metrica rotulo="projetos criados" valor={hoje.projetosCriados} />
            <Metrica rotulo="artes enviadas" valor={hoje.artesEnviadas} />
            <Metrica rotulo="links gerados" valor={hoje.linksGerados} />
            <Metrica rotulo="feedbacks" valor={hoje.feedbacksCriados} />
            <Metrica rotulo="aprovações pedidas" valor={hoje.aprovacoesSolicitadas} />
            <div className="col-span-2">
              <Metrica
                rotulo="aprovações decididas"
                valor={hoje.aprovacoesDecididas}
                nota="decisões antes do carimbo existir não entram na conta"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funil “viu?” · {funil.janelaDias} dias
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Metrica rotulo="links criados" valor={funil.criados} />
            <Metrica rotulo="abertos" valor={funil.abertos} />
            <Metrica rotulo="com feedback" valor={funil.comFeedback} />
            <Metrica rotulo="com decisão" valor={funil.comDecisao} />
            <p className="col-span-2 text-[11px] leading-relaxed text-muted-foreground/80">
              Contado por link aberto. “Com feedback” e “com decisão” se sobrepõem: dá para
              aprovar sem comentar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Precisa de você</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Atalho
              rotulo="Saques a moderar"
              valor={precisaDeVoce.saquesPendentes}
              href="/admin/saques"
              icone={ArrowDownToLine}
            />
            <Atalho
              rotulo="Disputas abertas"
              valor={precisaDeVoce.disputasAbertas}
              href="/disputas"
              icone={ScaleIcon}
            />
            <Atalho
              rotulo="Links parados há +48h"
              valor={precisaDeVoce.linksTravados}
              href="/links"
              icone={AlertTriangle}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fila rápida{naFila > 0 && <span className="ml-2 text-foreground">{naFila}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fila.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nada na fila.</p>
            ) : (
              <ul className="divide-y">
                {fila.map((item) => (
                  <li key={`${item.tipo}-${item.id}`}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.tipo === 'SAQUE' ? 'Saque' : 'Disputa'} · {quando(item.criadoEm)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary" className="text-[11px]">{item.status}</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cadastros recentes</CardTitle>
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href="/admin/usuarios">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Ver todos
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {usuariosRecentes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cadastro ainda.</p>
            ) : (
              <ul className="divide-y">
                {usuariosRecentes.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{u.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Quem não confirmou é o candidato natural a não voltar:
                          mostrar isso aqui é metade do trabalho de retenção. */}
                      {!u.emailVerificado && (
                        <Badge variant="outline" className="text-[11px]">e-mail pendente</Badge>
                      )}
                      <Badge variant="secondary" className="text-[11px]">{u.tipo}</Badge>
                      <span className="text-xs text-muted-foreground">{quando(u.criadoEm)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  )
}
