'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/layout/PageHeader'
import { FadeIn } from '@/components/layout/Motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  adminFinanceiroApi,
  mesAnterior,
  mesCorrente,
  type Movimento,
  type Periodo,
  type ResumoFinanceiro,
} from '@/lib/adminFinanceiro'

/**
 * A conferência do dinheiro da plataforma.
 *
 * Existe porque a receita do VIU — a taxa retida de cada fatura — era
 * calculada, gravada e somada em lugar nenhum. O resumo do admin acompanha
 * funil, fila de saques e usuários novos; de dinheiro não falava. Não havia
 * como responder "quanto faturamos no mês passado" sem abrir o banco.
 *
 * A densidade aqui é deliberada, e é o contrário do que o resto do produto
 * faz. O extrato do designer responde "quanto posso sacar" e por isso é
 * enxuto; esta tela responde "o que passou, quanto é nosso, e eu consigo
 * provar" — pergunta que pede tabela, período e arquivo.
 */
export default function AdminFinanceiroPage() {
  const [periodo, setPeriodo] = useState<Periodo>(mesCorrente)
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)

  const carregar = useCallback(async (p: Periodo) => {
    setCarregando(true)
    setErro(null)
    try {
      // As duas juntas: um resumo sem as linhas que o sustentam é um número
      // para acreditar, não para conferir.
      const [r, m] = await Promise.all([
        adminFinanceiroApi.resumo(p),
        adminFinanceiroApi.movimentos(p),
      ])
      setResumo(r)
      setMovimentos(m)
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? 'Não foi possível carregar o financeiro.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar(periodo)
  }, [carregar, periodo])

  async function exportar() {
    setBaixando(true)
    try {
      await adminFinanceiroApi.baixarCsv(periodo)
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Não foi possível gerar o arquivo.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <FadeIn className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Financeiro"
          description="O que passou pela plataforma no período, com a quebra entre o que é do VIU e o que é do designer."
        />
        <Button
          variant="outline"
          onClick={exportar}
          disabled={baixando || carregando}
          className="w-full sm:w-auto sm:shrink-0"
        >
          {baixando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden />
          )}
          Exportar CSV
        </Button>
      </div>

      {/* O período é o primeiro controle porque é a primeira decisão de quem
          confere: qual mês estou fechando. */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="fin-inicio">De</Label>
          <Input
            id="fin-inicio"
            type="date"
            value={periodo.inicio}
            onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))}
            className="w-auto"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fin-fim">Até</Label>
          <Input
            id="fin-fim"
            type="date"
            value={periodo.fim}
            onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))}
            className="w-auto"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPeriodo(mesCorrente())}>
            Mês atual
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPeriodo(mesAnterior())}>
            Mês anterior
          </Button>
        </div>
      </div>

      {erro ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
          <p className="flex-1 text-sm">{erro}</p>
          <Button size="sm" onClick={() => carregar(periodo)}>Tentar de novo</Button>
        </div>
      ) : carregando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Apurando o período…
        </div>
      ) : (
        <>
          {resumo && <Resumo resumo={resumo} />}
          <Movimentos movimentos={movimentos} />
        </>
      )}
    </FadeIn>
  )
}

function Resumo({ resumo }: { resumo: ResumoFinanceiro }) {
  return (
    <div className="space-y-3">
      {/* A receita em destaque: é o único número desta tela que é do VIU. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Numero
          titulo="Receita da plataforma"
          valor={resumo.receita.valorFormatado}
          apoio={`taxa retida de ${contar(resumo.receita.quantidade, 'fatura', 'faturas')} paga${resumo.receita.quantidade === 1 ? '' : 's'}`}
          destaque
        />
        <Numero
          titulo="Volume transacionado"
          valor={resumo.volume.valorFormatado}
          apoio="tudo o que passou, incluindo o do designer"
        />
        <Numero
          titulo="Repassado aos designers"
          valor={resumo.repassado.valorFormatado}
          apoio="volume menos a taxa"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Numero
          titulo="Saques pagos"
          valor={resumo.saquesPagos.valorFormatado}
          apoio={contar(resumo.saquesPagos.quantidade, 'saque', 'saques')}
        />
        {/* Sem recorte de período de propósito: é o que se deve hoje. */}
        <Numero
          titulo="A pagar agora"
          valor={resumo.aPagar.valorFormatado}
          apoio={`${contar(resumo.aPagar.quantidade, 'saque pedido', 'saques pedidos')} · fora do período`}
        />
        <Numero
          titulo="Retido em disputa"
          valor={resumo.retidoEmDisputa.valorFormatado}
          apoio={`${contar(resumo.retidoEmDisputa.quantidade, 'disputa aberta', 'disputas abertas')} · fora do período`}
        />
        <Numero
          titulo="Estornado"
          valor={resumo.estornado.valorFormatado}
          apoio={contar(resumo.estornado.quantidade, 'fatura', 'faturas')}
        />
      </div>

      {/*
        * A pendência dita, em vez de omitida.
        *
        * Quem audita precisa saber que não há nota emitida por trás desses
        * números — e descobrir isso pela ausência de uma coluna seria pior do
        * que ler a frase.
        */}
      <p className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
        <strong className="font-medium text-foreground">Nota fiscal:</strong> o VIU ainda não emite.
        Nenhum dos valores acima tem nota por trás, e a coluna abaixo fica vazia até a emissão
        existir. O plano está em <code className="font-mono">NFSE_POC.md</code>.
      </p>
    </div>
  )
}

function contar(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`
}

function Numero({
  titulo,
  valor,
  apoio,
  destaque,
}: {
  titulo: string
  valor: string
  apoio?: string
  destaque?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${destaque ? 'bg-primary/5' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`mt-1 tabular-nums ${destaque ? 'text-2xl font-semibold' : 'text-lg font-medium'}`}>
        {valor}
      </p>
      {apoio && <p className="mt-0.5 text-[11px] text-muted-foreground">{apoio}</p>}
    </div>
  )
}

function Movimentos({ movimentos }: { movimentos: Movimento[] }) {
  if (movimentos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhum movimento neste período.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Tabela de verdade, e não cartões: quem confere lê coluna, compara
          linha e soma com o olho. Rola na horizontal no telefone em vez de
          empilhar, porque a comparação entre colunas é o ponto. */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2.5 py-2 font-medium">Data</th>
              <th className="px-2.5 py-2 font-medium">Movimento</th>
              <th className="px-2.5 py-2 font-medium">Contraparte</th>
              <th className="px-2.5 py-2 text-right font-medium">Valor</th>
              <th className="px-2.5 py-2 text-right font-medium">Taxa</th>
              <th className="px-2.5 py-2 text-right font-medium">Líquido</th>
              <th className="px-2.5 py-2 font-medium">Referência</th>
              <th className="px-2.5 py-2 font-medium">NF</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {movimentos.map((m) => {
              const entrada = m.tipo === 'ENTRADA'
              return (
                <tr key={m.referencia} className="hover:bg-muted/20">
                  <td className="whitespace-nowrap px-2.5 py-2 tabular-nums text-muted-foreground">
                    {m.dataFormatada}
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="flex items-center gap-1.5">
                      {entrada ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                      )}
                      <span className="max-w-[26ch] truncate" title={m.descricao}>{m.descricao}</span>
                    </span>
                  </td>
                  <td className="max-w-[16ch] truncate px-2.5 py-2" title={m.contraparte}>
                    {m.contraparte}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums">
                    {m.valorFormatado}
                  </td>
                  {/* Só entrada tem taxa; num saque a coluna fica vazia em vez
                      de mostrar R$ 0,00, que pareceria uma taxa isenta. */}
                  <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums text-muted-foreground">
                    {entrada ? m.taxaPlataformaFormatada : '—'}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-right tabular-nums text-muted-foreground">
                    {m.valorLiquidoDesignerFormatado}
                  </td>
                  {/* O id inteiro tem 25 caracteres e empurra as colunas para
                      fora da tela. O prefixo diz o tipo, o sufixo identifica a
                      linha, e o título traz a referência completa para copiar. */}
                  <td className="whitespace-nowrap px-2.5 py-2 font-mono text-xs text-muted-foreground">
                    <span title={m.referencia}>
                      {m.referencia.split(':')[0]}:…{m.referencia.slice(-5)}
                    </span>
                  </td>
                  {/* "pendente", e não um travessão: o travessão repetido em
                      toda linha é o mesmo bloco morto que saiu do cartão de
                      cliente. Aqui a coluna informa um estado — não há nota, e
                      isso é o que quem confere precisa ler. */}
                  <td className="whitespace-nowrap px-2.5 py-2 text-xs text-muted-foreground">
                    pendente
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
