'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { Miniatura } from '@/components/dashboard/pecasDoCartao'

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
 * Forma: UM cartão com linhas, não um cartão por peça.
 *
 * A versão anterior dava a largura inteira à imagem de cada peça, e três
 * pendências viravam três telas de rolagem. A lista não precisa deixar a peça
 * AVALIÁVEL — precisa deixar IDENTIFICÁVEL; avaliar acontece no visualizador,
 * a um toque daqui, onde dá para dar zoom e ler o comentário. A miniatura
 * quadrada de 96px identifica, e as três pendências cabem numa tela só.
 *
 * Nenhum botão preenchido: a linha inteira é o alvo. Três blocos de cor
 * empilhados fazem cada um parecer menos urgente que o anterior, e num
 * telefone a linha é um alvo de toque maior que qualquer botão.
 */

export type ArteEsperando = {
  id: string
  arteId: string
  arteNome: string
  projetoNome: string | null
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
  if (dias === 1) return 'desde ontem'
  return `há ${dias} dias`
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
          projetoNome: a.arte?.projeto?.nome ?? null,
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

  const maisAntiga = Math.max(...itens.map((i) => diasDesde(i.criadoEm)))

  return (
    <section className="overflow-hidden rounded-xl border border-primary/25 bg-card">
      <header className="flex items-baseline justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold tracking-tight">Aguardando você</h2>
        <p className="shrink-0 text-xs text-muted-foreground">
          {itens.length === 1 ? '1 peça' : `${itens.length} peças`}
          {maisAntiga > 0 ? ` · a mais antiga ${espera(maisAntiga)}` : ''}
        </p>
      </header>

      <ul className="divide-y">
        {itens.map((item) => (
          <li key={item.id}>
            <Link
              href={item.arteId ? `/viewer/arte/${item.arteId}` : '#'}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:gap-4 sm:px-5"
            >
              {/* 64px, igual no celular e no desktop.
                  
                  Com 96px a linha passava de 190px de altura e o texto ficava
                  boiando no meio de um vão — o oposto da densidade que a gente
                  foi buscar. 64px ainda identifica a peça, e é o visualizador,
                  a um toque daqui, que existe para olhar de perto. */}
              <div className="w-16 shrink-0 overflow-hidden rounded-md border">
                <Miniatura src={item.previewUrl} nome={item.arteNome} proporcao="aspect-square" />
              </div>

              {/* Célula de duas linhas: identidade em cima, contexto embaixo.
                  Dobra a informação sem dobrar a altura da linha. */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.arteNome}
                  {item.versao ? (
                    <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                      v{item.versao}
                    </span>
                  ) : null}
                </p>
                {/*
                  A espera vem PRIMEIRO, e não há pílula de status.
                  
                  Todas as linhas deste cartão têm o mesmo estado — ele já está
                  no título "Aguardando você". Repetir "Aguardando sua revisão"
                  em cada uma gastava uma linha inteira no celular para dizer
                  três vezes a mesma coisa. O que diferencia uma linha da outra
                  é HÁ QUANTO TEMPO, e era justamente isso que o `truncate`
                  cortava quando o nome do projeto vinha na frente.
                */}
                <p suppressHydrationWarning className="truncate text-xs text-muted-foreground">
                  <span className="text-foreground/70">{espera(diasDesde(item.criadoEm))}</span>
                  {item.projetoNome ? ` · ${item.projetoNome}` : ''}
                </p>
              </div>

              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {/* A frase que diz o que a lista significa. É escrita, não CSS — e é o
          que separa uma tabela de um painel que explica a si mesmo. */}
      <p className="border-t px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        Abrir a peça é onde dá para olhar de perto, comentar e decidir. Nada aqui anda sem você.
      </p>
    </section>
  )
}
