'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { pagamentosApi, Fatura, FaturaStatus } from '@/lib/pagamentos'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import TermosProjetoCard from '@/components/projetos/termos/TermosProjetoCard'
import ContratoProjetoCard from '@/components/projetos/contrato/ContratoProjetoCard'
import type { PapelContrato } from '@/lib/contrato'
import type { CampoTermo } from '@/lib/termos'
import { passoDaCobranca } from '@/lib/passoDaCobranca'

const ROTULO_STATUS: Record<FaturaStatus, string> = {
  PENDENTE: 'Aguardando pagamento',
  PAGA: 'Paga',
  CANCELADA: 'Cancelada',
  ESTORNADA: 'Estornada',
}

/**
 * As faturas de um projeto.
 *
 * Esta aba oferecia os dois botões a qualquer um que a abrisse, e os dois são
 * 403 garantidos para metade das pessoas — a regra está no backend:
 *
 *   gerar  `faturaService.ts:49`   projeto.designerId !== requesterId → nega
 *   pagar  `faturaService.ts:105`  fatura.clienteId !== usuarioId     → nega
 *
 * Pior que o 403 era a contradição: a linha dizia "Aguardando pagamento do
 * cliente" e, ao lado, um botão mandando você pagar. Para o designer, que é
 * quem RECEBE, as duas metades da mesma linha se desmentiam.
 *
 * A condição aqui compara ids, não o tipo da conta — igual à tela da fatura
 * individual. Um ADMIN abrindo o projeto também não é o pagador.
 */
export default function FaturaTab({
  projetoId,
  designerId,
}: {
  projetoId: string;
  /** Dono do projeto. Só ele (ou um admin) pode gerar fatura. */
  designerId?: string | null;
}) {
  const router = useRouter()
  const { user } = useAuth()
  const usuarioId = (user as { id?: string } | null)?.id
  const ehAdmin = (user as { tipo?: string } | null)?.tipo === 'ADMIN'
  const podeGerar = ehAdmin || (!!usuarioId && !!designerId && usuarioId === designerId)

  /*
   * Estado do contrato, reportado pelo card abaixo. A aba não consulta de novo:
   * duas leituras da mesma coisa podem discordar, e discordar aqui significa o
   * aviso dizer "pode cobrar" enquanto o backend recusa. `null` enquanto a
   * primeira resposta não chega — sem isso a frase do passo nasceria errada,
   * anunciando "gere o resumo" antes de saber se os termos estão combinados.
   */
  const [estadoContrato, setEstadoContrato] = useState<{
    termosFaltantes: CampoTermo[]
    possoAceitar: boolean
    temContrato: boolean
    desatualizado: boolean
    faltam: PapelContrato[]
  } | null>(null)

  const receberEstadoContrato = useCallback(
    (e: {
      termosFaltantes: CampoTermo[]
      possoAceitar: boolean
      temContrato: boolean
      desatualizado: boolean
      faltam: PapelContrato[]
    }) =>
      setEstadoContrato({
        termosFaltantes: e.termosFaltantes,
        possoAceitar: e.possoAceitar,
        temContrato: e.temContrato,
        desatualizado: e.desatualizado,
        faltam: e.faltam,
      }),
    [],
  )

  /*
   * Bump quando os termos são salvos: o card do contrato relê e a frase do
   * passo acompanha. Sem isso, salvar os termos deixava a aba anunciando uma
   * pendência que a pessoa acabou de resolver.
   */
  const [versaoTermos, setVersaoTermos] = useState(0)

  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [alertaAberto, setAlertaAberto] = useState(false)

  /*
   * As duas listas porque a fatura tem dois lados e cada chamada traz um: o
   * designer não aparece em `?tipo=cliente` e vice-versa. A mesma fatura pode
   * vir nas duas quando alguém é os dois papéis, daí a deduplicação por id.
   */
  const carregar = useCallback(async () => {
    const [c, d] = await Promise.allSettled([
      pagamentosApi.getFaturas('cliente'),
      pagamentosApi.getFaturas('designer'),
    ])
    const todas: Fatura[] = []
    if (c.status === 'fulfilled') todas.push(...(c.value.data ?? []))
    if (d.status === 'fulfilled') todas.push(...(d.value.data ?? []))
    const vistas = new Set<string>()
    setFaturas(
      todas.filter((f) => {
        if (vistas.has(f.id) || f.projeto?.id !== projetoId) return false
        vistas.add(f.id)
        return true
      }),
    )
  }, [projetoId])

  useEffect(() => {
    carregar().catch(console.error).finally(() => setLoading(false))
  }, [carregar])

  /*
   * A fatura que impede outra de nascer.
   *
   * A regra é do backend — `faturaService.criarFatura` recusa quando já existe
   * PENDENTE ou PAGA no projeto, e desde a migração do índice parcial quem
   * garante é o banco. Aqui a mesma regra só decide se a pessoa vê um alerta
   * explicando, em vez de levar um 409 depois do clique.
   */
  const faturaAtiva = faturas.find((f) => f.status === 'PENDENTE' || f.status === 'PAGA') ?? null

  function aoClicarGerar() {
    if (faturaAtiva) {
      setAlertaAberto(true)
      return
    }
    void gerar()
  }

  async function gerar() {
    setGenerating(true)
    try {
      const nova = await pagamentosApi.gerarFaturaDoProjeto(projetoId)
      await carregar()
      toast.success('Fatura gerada.')
      return nova.data
    } catch (e: any) {
      /**
       * O servidor já diz o que faltou — "Projeto não possui orçamento
       * definido", "Já existe uma fatura ativa". Trocar isso por "Erro ao
       * gerar fatura" deixava a pessoa sem a única informação que resolveria
       * o problema dela.
       */
      toast.error(e?.message || 'Erro ao gerar fatura.')
      return null
    } finally {
      setGenerating(false)
    }
  }

  async function cancelarAtiva() {
    if (!faturaAtiva) return false
    try {
      await pagamentosApi.cancelarFatura(faturaAtiva.id)
      await carregar()
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível cancelar a fatura.')
      return false
    }
  }

  async function apenasCancelar() {
    setGenerating(true)
    const ok = await cancelarAtiva()
    setGenerating(false)
    if (ok) {
      setAlertaAberto(false)
      toast.success('Fatura cancelada. O projeto voltou a ficar sem cobrança.')
    }
  }

  /*
   * Cancela e gera num passo só, e sai do caminho: fecha o alerta e leva para
   * a fatura nova. Abrir outro diálogo por cima deste seria empilhar decisão
   * sobre decisão — a pessoa já decidiu aqui.
   */
  async function substituir() {
    setGenerating(true)
    const cancelou = await cancelarAtiva()
    if (!cancelou) {
      setGenerating(false)
      return
    }
    const nova = await gerar()
    setAlertaAberto(false)
    if (nova?.id) router.push(`/faturas/${nova.id}`)
  }

  const ehPagador = (f: Fatura) => !!usuarioId && f.cliente.id === usuarioId
  const ehRecebedor = (f: Fatura) => !!usuarioId && f.designer.id === usuarioId

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /*
   * Onde o projeto está na sequência — combinar, gerar, aceitar, cobrar.
   *
   * A conta é feita aqui, uma vez, e as três seções obedecem: só o passo atual
   * ganha botão cheio, e só ele escreve a frase explicativa. Antes cada seção
   * avisava por conta própria, e a mesma pendência aparecia em três caixas
   * âmbar seguidas, com dois botões cheios disputando a tela — um deles
   * desabilitado.
   */
  const passo = passoDaCobranca({
    podeCobrar: podeGerar,
    termosFaltantes: estadoContrato?.termosFaltantes ?? [],
    temContrato: estadoContrato?.temContrato ?? false,
    contratoDesatualizado: estadoContrato?.desatualizado ?? false,
    faltamAceitar: estadoContrato?.faltam ?? [],
    possoAceitar: estadoContrato?.possoAceitar ?? false,
    fatura: faturaAtiva?.status === 'PAGA' ? 'PAGA' : faturaAtiva ? 'PENDENTE' : 'NENHUMA',
    souPagador: !!faturaAtiva && ehPagador(faturaAtiva),
    nomeDoCliente: faturaAtiva?.cliente.nome,
  })

  /** A segunda linha de cada fatura: o estado dela em palavras, não em pílula. */
  function situacaoDaFatura(f: Fatura): string {
    if (f.status === 'PAGA') {
      return f.dataPagamento
        ? `Paga em ${new Date(f.dataPagamento).toLocaleDateString('pt-BR')}`
        : 'Pagamento confirmado'
    }
    if (f.status !== 'PENDENTE') return ROTULO_STATUS[f.status] ?? f.status
    if (ehPagador(f)) return 'Aguardando seu pagamento'
    return (
      `Aguardando o pagamento de ${f.cliente.nome}` +
      (ehRecebedor(f) ? ` · você recebe ${f.valorLiquidoDesignerFormatado}` : '')
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/*
        A única frase explicativa da aba. Âmbar só quando a pendência é de quem
        está lendo: um projeto esperando o cliente pagar não é problema do
        designer, e pintar isso de alerta treina a pessoa a ignorar alertas.
      */}
      {estadoContrato !== null && (
        <p
          className={cn(
            'text-sm',
            passo.pendente ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
          )}
        >
          {passo.frase}
        </p>
      )}

      {/*
        Uma borda só, com fio entre as seções. Eram três cartões empilhados,
        cada um com caixas âmbar dentro — caixa dentro de caixa dentro da aba,
        que já está dentro da página do projeto.

        A ordem é a do que acontece: combinar as condições, gerar o resumo que
        nasce delas, cobrar.
      */}
      <div className="divide-y rounded-xl border bg-card">
        <TermosProjetoCard
          projetoId={projetoId}
          podeEditar={podeGerar}
          emDestaque={passo.passo === 'COMBINAR'}
          aoSalvar={() => setVersaoTermos((v) => v + 1)}
        />

        <ContratoProjetoCard
          projetoId={projetoId}
          podeGerar={podeGerar}
          emDestaque={passo.passo === 'GERAR' || passo.passo === 'ACEITAR'}
          recarregar={versaoTermos}
          aoMudarEstado={receberEstadoContrato}
        />

        <section className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Faturas do projeto</h3>
            {podeGerar && (
              <Button
                size="sm"
                variant={passo.passo === 'COBRAR' ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={aoClicarGerar}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Gerar fatura
              </Button>
            )}
          </div>

          {faturas.length === 0 ? (
            /* Uma linha, não uma caixa tracejada de 10 de padding com um ícone
               grande no meio: "não há nada aqui" não merece o maior elemento
               da tela. */
            <p className="text-sm text-muted-foreground">Nenhuma fatura gerada ainda.</p>
          ) : (
            <ul className="divide-y">
              {faturas.map((fatura) => (
                <li key={fatura.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular-nums">
                      {fatura.valorFormatado}
                      {fatura.descricao ? (
                        <span className="font-normal text-muted-foreground"> · {fatura.descricao}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {situacaoDaFatura(fatura)}
                    </p>
                  </div>

                  {fatura.status === 'PENDENTE' && ehPagador(fatura) ? (
                    <Button
                      asChild
                      size="sm"
                      variant={passo.passo === 'PAGAR' ? 'default' : 'outline'}
                      className="h-8 shrink-0 gap-1"
                    >
                      <Link href={`/faturas/${fatura.id}`}>
                        <Zap className="h-3 w-3" />
                        Pagar com PIX
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="ghost" className="h-8 shrink-0">
                      <Link href={`/faturas/${fatura.id}`}>Ver</Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>


      {/*
        O alerta existe porque a recusa chegava como um toast vermelho depois
        do clique, sem dizer o que fazer a seguir. Aqui a pessoa lê a regra
        antes de tentar, vê qual é a fatura que está no caminho, e escolhe.
      */}
      <AlertDialog open={alertaAberto} onOpenChange={setAlertaAberto}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {faturaAtiva?.status === 'PAGA'
                ? 'Este projeto já foi pago'
                : 'Já existe uma fatura neste projeto'}
            </AlertDialogTitle>

            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                {faturaAtiva?.status === 'PAGA' ? (
                  <>
                    <p>
                      A fatura de <b className="text-foreground">{faturaAtiva.valorFormatado}</b> foi
                      paga
                      {faturaAtiva.dataPagamento
                        ? ` em ${new Date(faturaAtiva.dataPagamento).toLocaleDateString('pt-BR')}`
                        : ''}
                      . Um projeto não pode ter duas cobranças.
                    </p>
                    <p>Para cobrar outro trabalho deste cliente, crie um novo projeto.</p>
                  </>
                ) : (
                  <>
                    <p>
                      Há uma fatura de <b className="text-foreground">{faturaAtiva?.valorFormatado}</b>{' '}
                      aguardando pagamento. Um projeto só pode ter uma cobrança ativa por vez.
                    </p>
                    {/*
                      O aviso que não pode ser sutil: gerar outra apaga a cobrança
                      que o cliente já tem na mão. Se ele guardou o QR code, ele
                      para de funcionar.
                    */}
                    <p className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                      Gerar uma nova <b>cancela a atual</b>. O QR code que o cliente já recebeu deixa
                      de valer, e ele precisará do link novo para pagar.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={generating} className="mt-0">
              Fechar
            </AlertDialogCancel>

            {faturaAtiva?.status === 'PAGA' ? (
              <AlertDialogAction asChild>
                <Link href={`/faturas/${faturaAtiva.id}`}>Ver a fatura paga</Link>
              </AlertDialogAction>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={apenasCancelar}
                  disabled={generating}
                  className="gap-1.5"
                >
                  {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Cancelar fatura ativa
                </Button>
                <Button onClick={substituir} disabled={generating} className="gap-1.5">
                  {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Gerar nova fatura
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}