'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, FileSignature, History, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  contratoApi,
  hashCurto,
  ROTULO_PAPEL,
  type Contrato,
  type EstadoAceite,
  type PapelContrato,
  type VersaoContrato,
} from '@/lib/contrato'
import { type CampoTermo } from '@/lib/termos'

/**
 * O contrato do projeto: gerar, ler e aceitar.
 *
 * Fica logo abaixo dos termos porque é deles que ele nasce, e a ordem na tela é
 * a ordem do que acontece — combinar as condições, gerar o documento, as duas
 * partes aceitarem. Separar isso em outra aba esconderia a dependência e
 * deixaria alguém tentando gerar contrato sem ter combinado nada.
 *
 * Quem gera é o designer; quem aceita são as duas partes. A tela não decide
 * isso por conta própria: `meuPapel` vem calculado do servidor, porque errar
 * essa conta significa desenhar um botão que só sabe devolver 403 — defeito que
 * este produto já teve em fatura, disputa e arte.
 */

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function ContratoProjetoCard({
  projetoId,
  podeGerar,
  emDestaque,
  recarregar,
  aoMudarEstado,
}: {
  projetoId: string
  /** Designer do projeto ou admin. */
  podeGerar: boolean
  /**
   * Se o próximo passo da aba é aqui.
   *
   * Quem decide é `passoDaCobranca`, na aba — este card não tem como saber se
   * a seção de cima ainda está pendente. Só o passo atual ganha botão cheio:
   * com cada seção decidindo sozinha, a tela tinha dois e um deles vinha
   * desabilitado, tomando o destaque sem oferecer nada.
   */
  emDestaque: boolean
  /**
   * Muda quando os termos são salvos acima, para o estado do contrato ser
   * relido. Sem isso, salvar os termos deixava a frase da aba falando de uma
   * pendência que acabou de ser resolvida.
   */
  recarregar?: number
  /**
   * Reporta para a aba se o contrato está pronto e quem falta.
   *
   * Existe para o aviso junto do botão de gerar fatura não precisar buscar a
   * mesma coisa de novo — e, mais importante, para as duas partes da tela não
   * responderem coisas diferentes sobre o mesmo estado.
   */
  aoMudarEstado?: (estado: {
    /** O que falta nos termos, segundo a mesma leitura que traz o contrato. */
    termosFaltantes: CampoTermo[]
    /** Tenho papel no contrato e ainda não aceitei. */
    possoAceitar: boolean
    pronto: boolean
    /**
     * Se existe contrato gerado. Separado de `faltam` porque sem contrato o
     * estado já vem com os dois papéis pendentes — e dizer "faltam aceitarem"
     * sobre um documento que não existe manda a pessoa procurar o que aceitar.
     */
    temContrato: boolean
    faltam: PapelContrato[]
  }) => void
}) {
  /*
   * O aviso para a aba mora num ref, e fora das dependências de `carregar`.
   *
   * Ele é saída deste componente, não entrada da busca. Estando na lista de
   * dependências, ele dizia "busque de novo quando mudar quem é avisado" — e a
   * aba passa uma arrow inline, que nasce nova a cada render dela. Avisar
   * renderizava a aba, a arrow nascia nova, `carregar` nascia nova, o efeito
   * disparava e avisava de novo. Medido na aba Fatura antes da correção: 455
   * requisições ao contrato em 10 segundos, e este card preso no spinner para
   * sempre, porque `setCarregando(true)` voltava antes de qualquer resposta
   * chegar. A tela nunca chegava a mostrar o contrato.
   */
  const avisar = useRef(aoMudarEstado)
  useEffect(() => {
    avisar.current = aoMudarEstado
  })

  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [aceite, setAceite] = useState<EstadoAceite | null>(null)
  const [termosFaltantes, setTermosFaltantes] = useState<CampoTermo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [aceitando, setAceitando] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [versoes, setVersoes] = useState<VersaoContrato[] | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await contratoApi.vigente(projetoId)
      setContrato(res.data)
      setAceite(res.aceite)
      setTermosFaltantes(res.termosFaltantes)
      avisar.current?.({
        termosFaltantes: res.termosFaltantes,
        possoAceitar: !!res.data && !!res.aceite.meuPapel && !res.aceite.jaAceitei,
        pronto: !!res.data && res.aceite.faltam.length === 0,
        temContrato: !!res.data,
        faltam: res.aceite.faltam,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar o resumo.')
    } finally {
      setCarregando(false)
    }
    // `recarregar` não é lido no corpo — ele é o sinal de "leia de novo",
    // mandado pela aba quando os termos são salvos acima. O lint vê uma
    // dependência sem uso; tirá-la é que quebraria o comportamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId, recarregar])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function gerar() {
    setGerando(true)
    try {
      await contratoApi.gerar(projetoId)
      toast.success('Resumo gerado. Agora as duas partes precisam aceitar.')
      setVersoes(null) // o histórico mudou
      await carregar()
    } catch (err) {
      // Termos incompletos voltam como 409 com a frase pronta.
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o resumo.')
    } finally {
      setGerando(false)
    }
  }

  async function aceitar() {
    if (!contrato) return
    setAceitando(true)
    try {
      await contratoApi.aceitar(contrato.id)
      toast.success('Aceite registrado.')
      setLendo(false)
      await carregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível registrar o aceite.')
    } finally {
      setAceitando(false)
    }
  }

  async function verHistorico() {
    if (versoes) {
      setVersoes(null)
      return
    }
    try {
      setVersoes(await contratoApi.historico(projetoId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar as versões.')
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const termosProntos = termosFaltantes.length === 0
  const podeAceitar = !!contrato && !!aceite?.meuPapel && !aceite.jaAceitei

  return (
    <section className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {/*
            "Resumo do combinado" e não "Contrato".

            O documento tem texto congelado, hash e aceite por parte — o valor
            de prova não vem da palavra. Mas o texto ainda não passou por
            advogado, e chamá-lo de contrato convida a pessoa a confiar nele
            como peça oponível justamente por estar escrito no app. O nome volta
            a ser "contrato" na versão em que `revisadoJuridicamente` virar
            true; os identificadores no código seguem `ContratoProjeto`, que é o
            que a coisa é, e renomeá-los aqui só produziria churn.
          */}
          <FileSignature className="h-4 w-4" /> Resumo do combinado
        </h3>

        {contrato && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void verHistorico()}>
            <History className="h-3.5 w-3.5 mr-1" />
            {versoes ? 'Ocultar versões' : 'Versões'}
          </Button>
        )}
      </div>

      {!contrato ? (
        <>
          {/* Só o designer gera — mesma regra de criar fatura e definir termos. */}
          {podeGerar && (
            <Button
              size="sm"
              variant={emDestaque ? 'default' : 'outline'}
              onClick={() => void gerar()}
              disabled={gerando || !termosProntos}
            >
              {gerando && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Gerar resumo
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">v{contrato.versao}</Badge>
            <span className="font-mono text-muted-foreground">{contrato.templateVersao}</span>
            {/* O hash é a prova de que o texto não mudou: curto para conferir de
                relance, inteiro no title para poder ser copiado. */}
            <span className="font-mono text-muted-foreground" title={contrato.hash}>
              {hashCurto(contrato.hash)}…
            </span>
            <span className="text-muted-foreground">gerado em {dataCurta(contrato.criadoEm)}</span>
          </div>

          {/* Do dado, não de texto fixo: some sozinho quando a redação for revisada.
              Aqui é linha, não caixa: no card ela informa, e a caixa fica para o
              diálogo de leitura, que é o instante em que a pessoa vai aceitar. */}
          {!contrato.revisadoJuridicamente && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Redação pendente de revisão jurídica.
            </p>
          )}

          <div className="space-y-1.5 text-sm">
            {contrato.aceites.length > 0 ? (
              contrato.aceites.map((a) => (
                <p key={a.id} className="flex items-center gap-1.5 text-muted-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    {a.usuario?.nome ?? 'Alguém'}
                    {a.papel ? ` (${ROTULO_PAPEL[a.papel]})` : ''} aceitou em {dataCurta(a.criadoEm)}
                  </span>
                </p>
              ))
            ) : null}

            {/*
              Quem falta aceitar não se escreve aqui.
              
              A frase da aba já diz — e dizia a mesma coisa, palavra por
              palavra, seiscentos pixels acima: "Falta o cliente aceitar." em
              cima e "Falta o cliente aceitar." aqui. Esta seção lista quem
              aceitou; quem falta é assunto do passo, que é da aba.
            */}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {/* Um botão, não dois: "Ler o contrato" e "Ler e aceitar" abriam o
                mesmo diálogo lado a lado. O rótulo diz o que se faz lá dentro. */}
            <Button
              size="sm"
              variant={podeAceitar && emDestaque ? 'default' : 'outline'}
              onClick={() => setLendo(true)}
            >
              {podeAceitar ? 'Ler e aceitar' : 'Ler o resumo'}
            </Button>

            {aceite?.jaAceitei && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Você já aceitou
              </span>
            )}

            {podeGerar && (
              /* Gerar de novo após mudar os termos cria a versão seguinte; se
                 nada mudou, o backend devolve a mesma e ninguém precisa
                 reaceitar. */
              <Button size="sm" variant="ghost" onClick={() => void gerar()} disabled={gerando}>
                {gerando && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Gerar nova versão
              </Button>
            )}
          </div>

          {versoes && (
            <ul className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
              {versoes.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">v{v.versao}</span>
                  <span>{v.status === 'VIGENTE' ? 'vigente' : 'substituída'}</span>
                  <span>·</span>
                  <span>
                    {v.aceites.length} {v.aceites.length === 1 ? 'aceite' : 'aceites'}
                  </span>
                  <span className="font-mono" title={v.hash}>
                    {hashCurto(v.hash)}…
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={lendo} onOpenChange={setLendo}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Resumo do combinado {contrato ? `— v${contrato.versao}` : ''}
            </DialogTitle>
            <DialogDescription>
              Este é o texto exato registrado no aceite. Ele não muda depois de gerado.
            </DialogDescription>
          </DialogHeader>

          {contrato && !contrato.revisadoJuridicamente && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                <b>Pendente de revisão jurídica.</b> Esta redação ainda não foi validada por
                advogado.
              </p>
            </div>
          )}

          <div className="max-h-[55vh] overflow-y-auto rounded-lg border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
              {contrato?.texto}
            </pre>
          </div>

          {contrato && (
            <p className="font-mono text-xs text-muted-foreground" title={contrato.hash}>
              {contrato.templateVersao} · {hashCurto(contrato.hash)}…
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLendo(false)}>
              Fechar
            </Button>
            {podeAceitar && (
              <Button onClick={() => void aceitar()} disabled={aceitando}>
                {aceitando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Li e aceito
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
