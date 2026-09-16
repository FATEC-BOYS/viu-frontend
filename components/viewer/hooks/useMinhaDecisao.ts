'use client'

import { useCallback, useEffect, useState } from 'react'
import { perfilEmCache } from '@/lib/api'

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
}

const INTERVALO_MS = 30000

export function useMinhaDecisao(arteId: string, token: string) {
  const [pendencia, setPendencia] = useState<PendenciaDoViewer | null>(null)
  const [decidindo, setDecidindo] = useState(false)

  const carregar = useCallback(async () => {
    const eu = perfilEmCache()?.id
    // Sem sessão não há decisão a tomar: aprovar exige conta e ser o cliente
    // do projeto. Perguntar assim mesmo só renderia lista vazia.
    if (!eu) {
      setPendencia(null)
      return
    }
    try {
      const qs = new URLSearchParams({ token })
      const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/aprovacoes?${qs}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setPendencia(null)
        return
      }
      const json = await res.json()
      const minha = (json.aprovacoes ?? []).find(
        (a: any) => a.status === 'PENDENTE' && a.aprovador?.id === eu,
      )
      setPendencia(
        minha
          ? {
              id: String(minha.id),
              versaoNumero: minha.versaoNumero ?? null,
              aprovadorId: eu,
            }
          : null,
      )
    } catch {
      setPendencia(null)
    }
  }, [arteId, token])

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
      if (!pendencia) return { ok: false }
      setDecidindo(true)
      try {
        const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/aprovacoes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            aprovadorId: pendencia.aprovadorId,
            decisao: status,
            comentario: comentario ?? null,
          }),
        })
        if (!res.ok) {
          // A frase do backend é mais útil que um "falhou" genérico: é ela que
          // diz, por exemplo, que a recusa precisa de motivo.
          const corpo = await res.json().catch(() => ({}))
          return { ok: false, erro: corpo?.error }
        }
        await carregar()
        return { ok: true }
      } catch {
        return { ok: false }
      } finally {
        setDecidindo(false)
      }
    },
    [arteId, carregar, pendencia],
  )

  return { pendencia, decidir, decidindo, recarregar: carregar }
}
