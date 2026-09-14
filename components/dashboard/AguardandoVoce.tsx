'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'

/**
 * O que está esperando uma decisão SUA.
 *
 * Origem do buraco: o dashboard só perguntava `/aprovacoes?status=APROVADO` —
 * as decididas, para métrica e histórico. Ninguém perguntava pelas pendentes
 * em que o usuário logado é o aprovador. Resultado: o cliente entrava no VIU e
 * recebia a tela do designer (projetos, tarefas, feedbacks), sem nenhum sinal
 * da única coisa que ele precisava fazer. A fila dele existia no banco desde
 * sempre; faltava a pergunta.
 *
 * Some sozinho quando não há nada pendente — quem manda na presença desta
 * faixa é o dado, não o `tipo` do usuário. Designer que também é cliente de
 * outro projeto tem fila aqui, e ramificar por papel esconderia isso dele.
 *
 * Decide-se aqui dentro, sem navegar. Não é atalho: hoje não existe página de
 * arte para quem está logado — o visualizador inteiro é montado a partir do
 * token do link. Mandar a pessoa para um endereço que não abre seria repetir o
 * beco que acabamos de fechar no link.
 */

export type ArteEsperando = {
  id: string
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

export default function AguardandoVoce({ usuarioId }: { usuarioId: string | null }) {
  const [itens, setItens] = useState<ArteEsperando[]>([])
  const [carregou, setCarregou] = useState(false)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [pedindoAjuste, setPedindoAjuste] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  const carregar = useCallback(async () => {
    if (!usuarioId) return
    try {
      const res = await api.get<{ data: any[] }>(
        `/aprovacoes?status=PENDENTE&aprovadorId=${encodeURIComponent(usuarioId)}&limit=20`,
      )
      setItens(
        (res.data ?? []).map((a: any) => ({
          id: String(a.id),
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
      // Faixa de contexto: se falhar, o resto do dashboard segue na tela.
      setItens([])
    } finally {
      setCarregou(true)
    }
  }, [usuarioId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function decidir(id: string, status: 'APROVADO' | 'REJEITADO', comentario?: string) {
    setEnviando(id)
    try {
      await api.put(`/aprovacoes/${id}`, { status, comentario: comentario ?? null })
      toast.success(status === 'APROVADO' ? 'Arte aprovada' : 'Pedido de ajuste enviado')
      setPedindoAjuste(null)
      setMotivo('')
      await carregar()
    } catch (erro: any) {
      toast.error(erro?.message ?? 'Não foi possível registrar a decisão.')
    } finally {
      setEnviando(null)
    }
  }

  // Nada pendente não é estado vazio para mostrar: é uma faixa que não existe.
  if (!carregou || itens.length === 0) return null

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        Aguardando você
      </h2>

      <ul className="flex flex-col gap-3">
        {itens.map((item) => {
          const ocupado = enviando === item.id
          const ajustando = pedindoAjuste === item.id

          return (
            <li key={item.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                {item.previewUrl ? (
                  <Image
                    src={item.previewUrl}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-md border bg-muted" />
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.arteNome}
                    {item.versao ? (
                      <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                        v{item.versao}
                      </span>
                    ) : null}
                  </p>
                  <p suppressHydrationWarning className="text-xs text-muted-foreground">
                    {espera(diasDesde(item.criadoEm))}
                  </p>
                </div>
              </div>

              {ajustando ? (
                <div className="flex flex-col gap-2">
                  {/*
                    Pedir ajuste sem dizer o quê devolve ao designer o que ele
                    já tinha antes de perguntar. O backend recusa a recusa sem
                    motivo (422 RECUSA_SEM_MOTIVO); aqui o botão só desbloqueia
                    quando há texto, para a pessoa não descobrir a regra
                    levando um erro.
                  */}
                  <Textarea
                    autoFocus
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="O que precisa mudar?"
                    className="min-h-20 text-sm"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="h-11 sm:h-9"
                      disabled={ocupado || motivo.trim().length === 0}
                      onClick={() => decidir(item.id, 'REJEITADO', motivo.trim())}
                    >
                      {ocupado ? 'Enviando…' : 'Enviar pedido'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 sm:h-9"
                      disabled={ocupado}
                      onClick={() => {
                        setPedindoAjuste(null)
                        setMotivo('')
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="h-11 sm:h-9 sm:w-auto"
                    disabled={ocupado}
                    onClick={() => decidir(item.id, 'APROVADO')}
                  >
                    {ocupado ? 'Enviando…' : 'Aprovar'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 sm:h-9 sm:w-auto"
                    disabled={ocupado}
                    onClick={() => {
                      setPedindoAjuste(item.id)
                      setMotivo('')
                    }}
                  >
                    Pedir ajustes
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
