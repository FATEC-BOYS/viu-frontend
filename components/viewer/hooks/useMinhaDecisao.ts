'use client'

import { useCallback, useEffect, useState } from 'react'
import { decisoesDaVersao } from '@/lib/revisao'
import { useAuth } from '@/contexts/AuthContext'
import { listarAprovacoes, decidirAprovacao } from '@/lib/aprovacoesDaArte'

/**
 * A decisão que está esperando por QUEM ESTÁ OLHANDO — e nada mais.
 *
 * Existe porque no celular o painel de aprovações fica dentro de uma gaveta
 * cuja alça diz "Comentários". Quem abre o link no telefone — que é como o
 * cliente abre — precisa de três toques para achar o botão de decidir, e nada
 * na tela avisa que existe decisão pendente. O painel continua sendo o
 * histórico; isto aqui é só o "é a sua vez".
 *
 * Deliberadamente estreito: devolve uma pendência ou nenhuma. Ampliar para a
 * lista inteira faria dois donos do mesmo estado, e a gaveta e a barra
 * discordariam sobre o que já foi decidido.
 */

export type PendenciaDoViewer = {
  id: string
  versaoNumero: number | null
  aprovadorId: string
  arteId?: string
}

const INTERVALO_MS = 30000

export function useMinhaDecisao(arteId: string, token: string, versaoAtual?: number) {
  const [erro, setErro] = useState(false)
  const [pendencia, setPendencia] = useState<PendenciaDoViewer | null>(null)
  const [decidindo, setDecidindo] = useState(false)

  /*
   * Quem sou eu vem do `AuthProvider`, não de `perfilEmCache()`.
   *
   * O cache do `localStorage` é conveniência de interface, não credencial:
   * vem vazio em aba anônima, com armazenamento bloqueado, e — o mais comum —
   * na primeira carga, antes de o provider preencher. Nesses casos `eu` era
   * `undefined`, a função saía antes de perguntar, e o cliente que É o
   * aprovador não recebia a barra de "é a sua vez" na arte que esperava por
   * ele. O provider tem o cache para a primeira pintura E a confirmação do
   * /auth/me por trás, então ele responde certo nos dois momentos.
   */
  const { user } = useAuth()
  const eu = user?.id

  const carregar = useCallback(async () => {
    // Sem sessão não há decisão a tomar: aprovar exige conta e ser o cliente
    // do projeto. Perguntar assim mesmo só renderia lista vazia.
    if (!eu) {
      setPendencia(null)
      return
    }
    try {
      const aprovacoes = await listarAprovacoes(arteId)
      setErro(false)
      const elegiveis = versaoAtual === undefined ? aprovacoes : decisoesDaVersao(aprovacoes, versaoAtual)
      const minha = elegiveis.find(
        (a) => a.status === 'PENDENTE' && a.aprovador?.id === eu,
      )
      setPendencia(
        minha
          ? {
              id: String(minha.id),
              versaoNumero: minha.versaoNumero ?? null,
              aprovadorId: eu,
              arteId,
            }
          : null,
      )
    } catch {
      setErro(true)
      setPendencia(null)
    }
  }, [arteId, token, eu, versaoAtual])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, INTERVALO_MS)
    return () => clearInterval(t)
  }, [carregar])

  const decidir = useCallback(
    async (
      status: 'APROVADO' | 'REJEITADO',
      comentario?: string,
    ): Promise<{ ok: boolean; erro?: string }> => {
      if (!pendencia || pendencia.arteId !== arteId || (versaoAtual !== undefined && (pendencia.versaoNumero ?? 1) !== versaoAtual)) return { ok: false }
      setDecidindo(true)
      try {
        // Pelo id da pendência que ESTA tela escolheu e mostrou — nunca
        // redescobrindo a linha a partir do aprovador. Ver o porquê em
        // `decidirAprovacao`.
        await decidirAprovacao(pendencia.id, status, comentario ?? null)
        await carregar()
        return { ok: true }
      } catch (erro) {
        // A frase do backend é mais útil que um "falhou" genérico: é ela que
        // diz, por exemplo, que a recusa precisa de motivo.
        return { ok: false, erro: (erro as Error)?.message }
      } finally {
        setDecidindo(false)
      }
    },
    [arteId, carregar, pendencia, versaoAtual],
  )

  const atual = pendencia?.arteId === arteId && (versaoAtual === undefined || (pendencia.versaoNumero ?? 1) === versaoAtual) ? pendencia : null
  return { pendencia: atual, decidir, decidindo, erro, recarregar: carregar }
}
