'use client'

import { useCallback, useEffect, useState } from 'react'
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
  frasedeQuemFalta,
  hashCurto,
  ROTULO_PAPEL,
  type Contrato,
  type EstadoAceite,
  type VersaoContrato,
} from '@/lib/contrato'
import { frasedoQueFalta, type CampoTermo } from '@/lib/termos'

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
}: {
  projetoId: string
  /** Designer do projeto ou admin. */
  podeGerar: boolean
}) {
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar o contrato.')
    } finally {
      setCarregando(false)
    }
  }, [projetoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function gerar() {
    setGerando(true)
    try {
      await contratoApi.gerar(projetoId)
      toast.success('Contrato gerado. Agora as duas partes precisam aceitar.')
      setVersoes(null) // o histórico mudou
      await carregar()
    } catch (err) {
      // Termos incompletos voltam como 409 com a frase pronta.
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar o contrato.')
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
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileSignature className="h-4 w-4" /> Contrato do projeto
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
          <p className="text-sm text-muted-foreground">
            Nenhum contrato gerado. É ele que registra o que foi combinado e a quem pertence a peça
            se a conta não for paga.
          </p>

          {!termosProntos && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              Antes de gerar, falta combinar {frasedoQueFalta(termosFaltantes)}.
            </p>
          )}

          {/* Só o designer gera — mesma regra de criar fatura e definir termos. */}
          {podeGerar && (
            <Button size="sm" onClick={() => void gerar()} disabled={gerando || !termosProntos}>
              {gerando && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Gerar contrato
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

          {/* Do dado, não de texto fixo: some sozinho quando a redação for revisada. */}
          {!contrato.revisadoJuridicamente && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                <b>Pendente de revisão jurídica.</b> Esta redação ainda não foi validada por
                advogado.
              </p>
            </div>
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
            ) : (
              <p className="text-muted-foreground">Ninguém aceitou esta versão ainda.</p>
            )}

            {aceite && aceite.faltam.length > 0 && (
              <p className="text-muted-foreground">{frasedeQuemFalta(aceite.faltam)}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setLendo(true)}>
              Ler o contrato
            </Button>

            {podeAceitar && (
              <Button size="sm" onClick={() => setLendo(true)}>
                Ler e aceitar
              </Button>
            )}

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
              Contrato do projeto {contrato ? `— v${contrato.versao}` : ''}
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
