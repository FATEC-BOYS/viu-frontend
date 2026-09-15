'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { Miniatura, Pilula } from '@/components/dashboard/pecasDoCartao'

/**
 * O que está esperando uma decisão SUA.
 *
 * Origem do buraco: o dashboard só perguntava `/aprovacoes?status=APROVADO` —
 * as decididas, para métrica e histórico. Ninguém perguntava pelas pendentes
 * em que o usuário logado é o aprovador. Resultado: o cliente entrava no VIU e
 * recebia a tela do designer, sem nenhum sinal da única coisa que ele
 * precisava fazer. A fila dele existia no banco desde sempre; faltava a
 * pergunta.
 *
 * Some sozinho quando não há nada pendente — quem manda na presença desta
 * faixa é o dado, não o `tipo` do usuário. Designer que também é cliente de
 * outro projeto tem fila aqui, e ramificar por papel esconderia isso dele.
 *
 * Um cartão, uma ação: **abrir a revisão**. A versão anterior decidia aqui
 * dentro, com botões de aprovar e pedir ajustes ao lado de uma miniatura de
 * 56px — aprovar sem ver a peça. Isso existia porque a arte não tinha
 * endereço para quem está logado; agora tem (`/viewer/arte/<id>`), e a decisão
 * mora onde dá para olhar de perto, junto do comentário e do histórico.
 */

export type ArteEsperando = {
  id: string
  arteId: string
  arteNome: string
  versao: number | null
  previewUrl: string | null
  criadoEm: string
}

function diasDesde(iso: string): number {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

function espera(dias: number): string {
  if (dias === 0) return 'chegou hoje'
  if (dias === 1) return 'esperando desde ontem'
  return `esperando há ${dias} dias`
}

export default function AguardandoVoce({
  usuarioId,
  vazio = null,
}: {
  usuarioId: string | null
  /**
   * O que mostrar quando não há nada pendente.
   *
   * O padrão é nada: no painel do designer esta faixa não deve ocupar espaço
   * com uma caixa vazia. No do cliente ela é o bloco principal da tela, e
   * sumir sem dizer nada deixaria um buraco — por isso ele passa um recado.
   */
  vazio?: React.ReactNode
}) {
  const [itens, setItens] = useState<ArteEsperando[]>([])
  const [carregou, setCarregou] = useState(false)

  const carregar = useCallback(async () => {
    if (!usuarioId) return
    try {
      const res = await api.get<{ data: any[] }>(
        `/aprovacoes?status=PENDENTE&aprovadorId=${encodeURIComponent(usuarioId)}&limit=20`,
      )
      setItens(
        (res.data ?? []).map((a: any) => ({
          id: String(a.id),
          arteId: String(a.arte?.id ?? ''),
          arteNome: a.arte?.nome ?? 'Arte sem nome',
          // `versaoNumero` é a versão julgada; `arte.versao` é a atual. Mostrar
          // a segunda faria a linha mudar de rótulo quando o designer subisse
          // outra entrega, sem que a decisão pendente fosse outra.
          versao: a.versaoNumero ?? a.arte?.versao ?? null,
          previewUrl: a.arte?.previewUrl ?? null,
          criadoEm: a.criadoEm ?? a.criado_em ?? '',
        })),
      )
    } catch {
      // Faixa de contexto: se falhar, o resto do painel segue na tela.
      setItens([])
    } finally {
      setCarregou(true)
    }
  }, [usuarioId])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (!carregou) return null
  if (itens.length === 0) return <>{vazio}</>

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Aguardando você</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {itens.length === 1 ? '1 peça' : `${itens.length} peças`}
        </span>
      </div>

      {/* Uma coluna no celular: a peça é o assunto, e miniatura pequena numa
          grade de duas colunas obriga a abrir para saber o que é. */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item) => (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm"
          >
            <Link href={item.arteId ? `/viewer/arte/${item.arteId}` : '#'} className="block">
              <Miniatura src={item.previewUrl} nome={item.arteNome} />
            </Link>

            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-2">
                <Pilula tom="atencao">Aguardando sua revisão</Pilula>
                <h3 className="text-base font-semibold leading-snug tracking-tight">
                  {item.arteNome}
                  {item.versao ? (
                    <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                      v{item.versao}
                    </span>
                  ) : null}
                </h3>
                <p suppressHydrationWarning className="text-xs text-muted-foreground">
                  {espera(diasDesde(item.criadoEm))}
                </p>
              </div>

              {/* Uma ação por cartão, e do tamanho do polegar. */}
              <Button asChild className="h-12 w-full text-sm">
                <Link href={item.arteId ? `/viewer/arte/${item.arteId}` : '#'}>Abrir revisão</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
