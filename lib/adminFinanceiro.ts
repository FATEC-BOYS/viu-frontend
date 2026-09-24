import { api, BASE_URL } from '@/lib/api'

/**
 * O dinheiro da plataforma, para quem responde por ele.
 *
 * A taxa retida de cada fatura — 5% a 10%, conforme o plano do designer — é a
 * receita do VIU. Era calculada, gravada em cada fatura, e somada em lugar
 * nenhum: o resumo do admin acompanha funil, fila de saques e usuários novos,
 * e de dinheiro não fala. Não havia como responder "quanto faturamos no mês
 * passado" sem abrir o banco.
 */

export type LinhaDeResumo = {
  valor: number
  valorFormatado: string
  quantidade: number
}

export type ResumoFinanceiro = {
  periodo: { inicio: string; fim: string }
  /** A receita do VIU: a soma das taxas retidas. */
  receita: LinhaDeResumo
  /** Tudo o que passou, incluindo o que é do designer. */
  volume: LinhaDeResumo
  repassado: LinhaDeResumo
  estornado: LinhaDeResumo
  saquesPagos: LinhaDeResumo
  /** Dívida de hoje, sem recorte de período. */
  aPagar: LinhaDeResumo
  retidoEmDisputa: LinhaDeResumo
  /** `null` enquanto a emissão não existe — ver NFSE_POC.md no backend. */
  notasFiscais: null
}

export type Movimento = {
  id: string
  tipo: 'ENTRADA' | 'SAIDA'
  data: string
  dataFormatada: string
  descricao: string
  contraparte: string
  designer: string
  valor: number
  valorFormatado: string
  taxaPlataforma: number
  taxaPlataformaFormatada: string
  valorLiquidoDesigner: number
  valorLiquidoDesignerFormatado: string
  referencia: string
  projetoId: string | null
  notaFiscal: null
}

export type Periodo = { inicio: string; fim: string }

function query(p: Periodo) {
  return new URLSearchParams({ inicio: p.inicio, fim: p.fim }).toString()
}

/** O mês corrente, que é o recorte com que se abre uma conferência. */
export function mesCorrente(): Periodo {
  const hoje = new Date()
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return {
    inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    fim: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  }
}

export function mesAnterior(): Periodo {
  const hoje = new Date()
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return {
    inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
    fim: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
  }
}

export const adminFinanceiroApi = {
  resumo: (p: Periodo) =>
    api.get<{ data: ResumoFinanceiro }>(`/admin/financeiro/resumo?${query(p)}`).then((r) => r.data),

  movimentos: (p: Periodo) =>
    api
      .get<{ data: Movimento[] }>(`/admin/financeiro/movimentos?${query(p)}`)
      .then((r) => r.data ?? []),

  /**
   * O CSV vem do servidor com o período inteiro, e não do que está na tela.
   *
   * Exportar o que foi renderizado produziria um arquivo que parece completo e
   * não é — e num arquivo de conferência isso é pior do que não exportar.
   */
  async baixarCsv(p: Periodo): Promise<void> {
    const res = await fetch(
      `${BASE_URL}/admin/financeiro/movimentos?${query(p)}&formato=csv`,
      { credentials: 'include' },
    )
    if (!res.ok) throw new Error('Não foi possível gerar o arquivo.')
    const blob = await res.blob()

    /*
     * Blob e não `<a href>` direto para a API: assim o erro do servidor vira
     * mensagem na tela em vez de uma aba com JSON de erro, e o download não
     * depende de como o cookie de sessão está configurado quanto a SameSite.
     */
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `viu-financeiro-${p.inicio}_${p.fim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
