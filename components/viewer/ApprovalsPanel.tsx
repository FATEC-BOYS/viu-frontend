// components/viewer/ApprovalsPanel.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { perfilEmCache } from '@/lib/api'

/**
 * Decisões desta arte, e — quando for a sua vez — o botão para decidir.
 *
 * O que saiu daqui e por quê:
 *
 * - "Aprovações via link": a rota nunca teve fonte de convidados, então a seção
 *   dizia "Nenhum convidado aprovou ainda" para sempre.
 * - "Fechar para aprovação": o endpoint era um stub que devolvia `{ok:true}`.
 *   A tela mostrava sucesso sobre um no-op.
 * - "(v1)" no título: vinha de um `versao: 1` fixo na rota, não da arte.
 * - Aprovar/Rejeitar em toda linha: o backend recusa decidir pelos outros
 *   (`aprovadorId !== userId` → 403), então a UI oferecia o que ia falhar e
 *   entregava o erro num `alert()`.
 */

type Aprovacao = {
  id: string
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  comentario: string | null
  criadoEm: string
  versaoNumero: number | null
  aprovador: { id: string; nome: string | null } | null
}

const ROTULO: Record<Aprovacao['status'], string> = {
  PENDENTE: 'Aguardando decisão',
  APROVADO: 'Aprovado',
  REJEITADO: 'Recusado',
}

const ICONE = { PENDENTE: Clock, APROVADO: Check, REJEITADO: X }

const TOM: Record<Aprovacao['status'], string> = {
  PENDENTE: 'border-border bg-muted text-muted-foreground',
  APROVADO: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  REJEITADO: 'border-destructive/25 bg-destructive/10 text-destructive',
}

function iniciais(nome?: string | null) {
  const base = (nome || 'AP').trim()
  const partes = base.split(' ')
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

export default function ApprovalsPanel({ arteId, token }: { arteId: string; token: string }) {
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [decidindo, setDecidindo] = useState<string | null>(null)

  // Quem está olhando. Só o próprio aprovador pode decidir — é a mesma regra
  // que o backend aplica; aqui ela só deixa de ser uma promessa falsa na tela.
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  useEffect(() => {
    setUsuarioId(perfilEmCache()?.id ?? null)
  }, [])

  const carregar = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ token })
      const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/aprovacoes?${qs}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setAprovacoes([])
        return
      }
      const json = await res.json()
      setAprovacoes(json.aprovacoes ?? [])
    } catch {
      setAprovacoes([])
    } finally {
      setCarregando(false)
    }
  }, [arteId, token])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [carregar])

  async function decidir(ap: Aprovacao, decisao: 'APROVADO' | 'REJEITADO') {
    setDecidindo(ap.id)
    try {
      const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/aprovacoes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ aprovadorId: ap.aprovador?.id, decisao }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j?.error ?? 'Não foi possível registrar a decisão.')
        return
      }
      toast.success(decisao === 'APROVADO' ? 'Arte aprovada' : 'Arte recusada')
      await carregar()
    } catch {
      toast.error('Falha ao registrar a decisão.')
    } finally {
      setDecidindo(null)
    }
  }

  const pendentes = aprovacoes.filter((a) => a.status === 'PENDENTE').length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Aprovações</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {carregando
            ? 'Carregando…'
            : aprovacoes.length === 0
              ? 'Nada foi enviado para aprovação ainda.'
              : pendentes > 0
                ? `${pendentes} aguardando decisão`
                : 'Tudo decidido'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {!carregando && aprovacoes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Quando o designer solicitar a aprovação desta arte, ela aparece aqui.
            </p>
          )}

          {aprovacoes.map((ap) => {
            const Icone = ICONE[ap.status]
            // A decisão é de quem foi escolhido para decidir, e só enquanto
            // estiver pendente — APROVADO e REJEITADO são terminais no backend.
            const minhaVez = ap.status === 'PENDENTE' && !!usuarioId && ap.aprovador?.id === usuarioId

            return (
              <div key={ap.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {iniciais(ap.aprovador?.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {ap.aprovador?.nome ?? 'Aprovador'}
                      </p>
                      <p suppressHydrationWarning className="text-[11px] text-muted-foreground">
                        {ap.versaoNumero ? `v${ap.versaoNumero} · ` : ''}
                        {ap.criadoEm ? new Date(ap.criadoEm).toLocaleDateString('pt-BR') : ''}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${TOM[ap.status]}`}
                  >
                    <Icone className="h-3 w-3" />
                    {ROTULO[ap.status]}
                  </span>
                </div>

                {ap.comentario && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {ap.comentario}
                  </p>
                )}

                {minhaVez && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      disabled={decidindo === ap.id}
                      onClick={() => decidir(ap, 'APROVADO')}
                    >
                      {decidindo === ap.id ? 'Enviando…' : 'Aprovar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decidindo === ap.id}
                      onClick={() => decidir(ap, 'REJEITADO')}
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
