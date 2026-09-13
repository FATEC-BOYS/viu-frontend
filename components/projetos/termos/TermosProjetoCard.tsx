'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2, ScrollText, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  termosApi,
  frasedoQueFalta,
  ROTULO_ARQUIVOS_FONTE,
  type TermosProjeto,
  type TermosEntrada,
  type CampoTermo,
  type PreviaAnexo,
} from '@/lib/termos'

/**
 * O que foi combinado entre designer e cliente, como formulário.
 *
 * Mora na aba de Fatura, e não numa sétima aba, por dois motivos. A trilha de
 * abas já não cabia em 390px com seis. E é aqui que a falta destes campos
 * atrapalha: a pessoa vem cobrar e descobre que ainda não combinou sob quais
 * condições. O aviso aparece onde a ação está, em vez de num canto que ninguém
 * abre.
 *
 * Só o designer edita — mesma regra de gerar fatura, porque é a mesma decisão:
 * o que vai ser cobrado e sob quais condições. O cliente lê.
 */

/** Uma data ISO vira o `yyyy-mm-dd` que o input[type=date] entende. */
function paraInputDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

/** E volta com hora zero em UTC, porque o backend valida datetime com offset. */
function deInputDate(valor: string): string | null {
  return valor ? new Date(`${valor}T00:00:00.000Z`).toISOString() : null
}

export default function TermosProjetoCard({
  projetoId,
  podeEditar,
}: {
  projetoId: string
  /** Designer do projeto ou admin. O cliente lê e não edita. */
  podeEditar: boolean
}) {
  const [termos, setTermos] = useState<TermosProjeto | null>(null)
  const [faltam, setFaltam] = useState<CampoTermo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [previa, setPrevia] = useState<PreviaAnexo | null>(null)
  const [abrindoPrevia, setAbrindoPrevia] = useState(false)

  // Estado do formulário, separado do que veio do servidor.
  const [form, setForm] = useState<TermosEntrada>({})

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await termosApi.get(projetoId)
      setTermos(res.data)
      setFaltam(res.faltam)
      setForm({
        rodadasIncluidas: res.data?.rodadasIncluidas ?? null,
        prazoRevisaoDiasUteis: res.data?.prazoRevisaoDiasUteis ?? null,
        licencaFinalidade: res.data?.licencaFinalidade ?? null,
        licencaTerritorio: res.data?.licencaTerritorio ?? null,
        licencaPrazo: res.data?.licencaPrazo ?? null,
        licencaPrazoAte: res.data?.licencaPrazoAte ?? null,
        exclusividade: res.data?.exclusividade ?? null,
        exclusividadeAte: res.data?.exclusividadeAte ?? null,
        arquivosFonte: res.data?.arquivosFonte ?? null,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar os termos.')
    } finally {
      setCarregando(false)
    }
  }, [projetoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar() {
    setSalvando(true)
    try {
      const res = await termosApi.salvar(projetoId, form)
      setTermos(res.data)
      setFaltam(res.faltam)
      toast.success(res.completos ? 'Termos combinados.' : 'Salvo. Ainda falta preencher algo.')
    } catch (err) {
      // O backend recusa combinação incoerente (prazo até uma data sem a data,
      // exclusividade sem fim) e explica qual campo.
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar os termos.')
    } finally {
      setSalvando(false)
    }
  }

  async function verAnexo() {
    setAbrindoPrevia(true)
    try {
      setPrevia(await termosApi.previa(projetoId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar a prévia.')
    } finally {
      setAbrindoPrevia(false)
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const completos = faltam.length === 0

  /* Sem permissão de editar, a seção vira leitura — o cliente precisa ver o que
     foi combinado, mas mudar é decisão de quem cobra. */
  if (!podeEditar) {
    return (
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ScrollText className="h-4 w-4" /> O que foi combinado
        </h3>
        {completos && termos ? (
          <ResumoTermos termos={termos} />
        ) : (
          <p className="text-sm text-muted-foreground">
            O designer ainda não registrou as condições deste projeto.
          </p>
        )}
        {completos && (
          <Button size="sm" variant="outline" onClick={() => void verAnexo()} disabled={abrindoPrevia}>
            {abrindoPrevia ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1.5" />
            )}
            Ler o anexo
          </Button>
        )}
        <DialogAnexo previa={previa} aoFechar={() => setPrevia(null)} />
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ScrollText className="h-4 w-4" /> O que foi combinado
        </h3>
        {completos && (
          <Button size="sm" variant="outline" onClick={() => void verAnexo()} disabled={abrindoPrevia}>
            {abrindoPrevia ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1.5" />
            )}
            Ver o anexo
          </Button>
        )}
      </div>

      {!completos && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          Falta combinar {frasedoQueFalta(faltam)}. Sem isso o anexo do projeto sai com lacunas — e
          é ele que decide de quem é a peça se a conta não for paga.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rodadas">Rodadas de revisão por entrega</Label>
          <Input
            id="rodadas"
            type="number"
            min={0}
            max={99}
            value={form.rodadasIncluidas ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                rodadasIncluidas: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Vale para cada peça, não para o projeto somado. Zero também é um acordo válido.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prazo">Prazo do cliente para revisar (dias úteis)</Label>
          <Input
            id="prazo"
            type="number"
            min={1}
            max={365}
            value={form.prazoRevisaoDiasUteis ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                prazoRevisaoDiasUteis: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
          />
          {/* Sem aprovação tácita: o silêncio não aprova nada, então este
              número é combinado e exibido, nunca gatilho automático. */}
          <p className="text-xs text-muted-foreground">
            Passado o prazo, a versão <b>não</b> é aprovada sozinha.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="finalidade">Onde a peça pode ser usada</Label>
        <Textarea
          id="finalidade"
          rows={2}
          placeholder="Ex.: redes sociais e material impresso institucional"
          value={form.licencaFinalidade ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, licencaFinalidade: e.target.value || null }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="territorio">Território</Label>
          <Input
            id="territorio"
            placeholder="Brasil, mundial…"
            value={form.licencaTerritorio ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, licencaTerritorio: e.target.value || null }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Até quando a licença vale</Label>
          <Select
            value={form.licencaPrazo ?? ''}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                licencaPrazo: v as 'INDETERMINADO' | 'ATE_DATA',
                // Trocar para indeterminado limpa a data: guardar uma data que
                // o contrato não menciona confunde quem for ler depois.
                licencaPrazoAte: v === 'INDETERMINADO' ? null : f.licencaPrazoAte,
              }))
            }
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INDETERMINADO">Prazo indeterminado</SelectItem>
              <SelectItem value="ATE_DATA">Até uma data</SelectItem>
            </SelectContent>
          </Select>
          {form.licencaPrazo === 'ATE_DATA' && (
            <Input
              type="date"
              aria-label="Licença válida até"
              value={paraInputDate(form.licencaPrazoAte ?? null)}
              onChange={(e) => setForm((f) => ({ ...f, licencaPrazoAte: deInputDate(e.target.value) }))}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Arquivos-fonte (editáveis)</Label>
          <Select
            value={form.arquivosFonte ?? ''}
            onValueChange={(v) => setForm((f) => ({ ...f, arquivosFonte: v as never }))}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ROTULO_ARQUIVOS_FONTE) as Array<keyof typeof ROTULO_ARQUIVOS_FONTE>).map(
                (k) => (
                  <SelectItem key={k} value={k}>
                    {ROTULO_ARQUIVOS_FONTE[k]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Exclusividade</Label>
          {/*
            Select e não Switch. O campo tem três estados — sim, não, e ninguém
            respondeu — e um switch só tem dois: começando em `null` ele é
            desenhado apagado, a pessoa lê "já está como não" e nunca clica.
            O aviso então reclamaria de um campo que a tela aparenta ter
            respondido. Com "Selecione", a pergunta em aberto se parece com uma.
          */}
          <Select
            value={form.exclusividade === true ? 'SIM' : form.exclusividade === false ? 'NAO' : ''}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                exclusividade: v === 'SIM',
                // Responder "não" limpa a data: prazo de exclusividade que não
                // existe não pode sobrar no formulário.
                exclusividadeAte: v === 'SIM' ? f.exclusividadeAte : null,
              }))
            }
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NAO">Não</SelectItem>
              <SelectItem value="SIM">Sim</SelectItem>
            </SelectContent>
          </Select>
          {form.exclusividade === true && (
            <>
              <Input
                type="date"
                aria-label="Exclusividade até"
                value={paraInputDate(form.exclusividadeAte ?? null)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, exclusividadeAte: deInputDate(e.target.value) }))
                }
              />
              {/* Exclusividade sem fim deixa de ser licença e vira cessão. */}
              <p className="text-xs text-muted-foreground">Exclusividade precisa de prazo.</p>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => void salvar()} disabled={salvando}>
          {salvando && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Salvar termos
        </Button>
      </div>

      <DialogAnexo previa={previa} aoFechar={() => setPrevia(null)} />
    </section>
  )
}

function ResumoTermos({ termos }: { termos: TermosProjeto }) {
  const linhas: Array<[string, string]> = [
    ['Rodadas por entrega', String(termos.rodadasIncluidas ?? '—')],
    ['Prazo para revisar', termos.prazoRevisaoDiasUteis ? `${termos.prazoRevisaoDiasUteis} dias úteis` : '—'],
    ['Uso permitido', termos.licencaFinalidade ?? '—'],
    ['Território', termos.licencaTerritorio ?? '—'],
    [
      'Licença válida',
      termos.licencaPrazo === 'ATE_DATA' && termos.licencaPrazoAte
        ? `até ${new Date(termos.licencaPrazoAte).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
        : termos.licencaPrazo === 'INDETERMINADO'
          ? 'por prazo indeterminado'
          : '—',
    ],
    [
      'Exclusividade',
      termos.exclusividade && termos.exclusividadeAte
        ? `sim, até ${new Date(termos.exclusividadeAte).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
        : termos.exclusividade === false
          ? 'não'
          : '—',
    ],
    ['Arquivos-fonte', termos.arquivosFonte ? ROTULO_ARQUIVOS_FONTE[termos.arquivosFonte] : '—'],
  ]

  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{rotulo}</dt>
          <dd className="truncate">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function DialogAnexo({ previa, aoFechar }: { previa: PreviaAnexo | null; aoFechar: () => void }) {
  return (
    <Dialog open={previa !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Anexo de revisão e propriedade intelectual</DialogTitle>
          <DialogDescription>
            Prévia com os termos atuais. O documento que vale é o gerado e aceito pelas duas partes.
          </DialogDescription>
        </DialogHeader>

        {/* O aviso sai do dado, não de um texto fixo: quando o template passar
            pela revisão jurídica, ele some sozinho. */}
        {previa && !previa.revisadoJuridicamente && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              <b>Pendente de revisão jurídica.</b> Este texto é rascunho e ainda não foi validado por
              advogado.
            </p>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
            {previa?.texto}
          </pre>
        </div>

        {previa && (
          <p className="text-xs text-muted-foreground">Modelo {previa.templateVersao}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
