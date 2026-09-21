import { api } from '@/lib/api'

/**
 * Os dados que uma nota fiscal precisa de quem a recebe.
 *
 * O VIU ainda não emite nota — os termos dizem isso na cláusula 4.2 — e este
 * módulo não emite nada. É o terreno: sem documento conferido e endereço
 * completo, nenhum emissor aceita o pedido, e não havia um só desses campos em
 * lugar nenhum do produto.
 *
 * Serve aos dois lados: o VIU emitindo para o designer (assinatura e taxa
 * retida) e o designer emitindo para o cliente. Mesmos campos, mesma rota.
 */

export type TipoPessoa = 'FISICA' | 'JURIDICA'

export type DadosFiscais = {
  tipoPessoa: TipoPessoa
  /** Só dígitos, como o banco guarda. */
  documento: string
  /** Com pontuação, pronto para exibir — vem do servidor. */
  documentoFormatado: string
  razaoSocial: string
  nomeFantasia: string | null
  inscricaoMunicipal: string | null
  cep: string
  cepFormatado: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  uf: string
}

export type DadosFiscaisEntrada = {
  tipoPessoa: TipoPessoa
  documento: string
  razaoSocial: string
  nomeFantasia?: string | null
  inscricaoMunicipal?: string | null
  cep: string
  logradouro: string
  numero: string
  complemento?: string | null
  bairro: string
  cidade: string
  uf: string
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/**
 * As máscaras são só forma, e por isso podem morar aqui.
 *
 * Quem confere se o documento é válido é o servidor — a tela de saques já
 * estabeleceu esse arranjo com a chave PIX, e por bom motivo: o algoritmo dos
 * dígitos verificadores copiado nos dois lados seriam duas verdades sobre o
 * que é um CNPJ válido, e a divergência apareceria numa nota recusada.
 * Aqui só se ajuda a digitar.
 */
export function mascararDocumento(bruto: string, tipo: TipoPessoa): string {
  const d = bruto.replace(/\D/g, '').slice(0, tipo === 'FISICA' ? 11 : 14)
  if (tipo === 'FISICA') {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function mascararCep(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** O rótulo do campo muda com o tipo: pedir "razão social" a uma pessoa
 *  física é pedir uma coisa que ela não tem. */
export function rotuloDoNome(tipo: TipoPessoa): string {
  return tipo === 'FISICA' ? 'Nome completo' : 'Razão social'
}

export function rotuloDoDocumento(tipo: TipoPessoa): string {
  return tipo === 'FISICA' ? 'CPF' : 'CNPJ'
}

/**
 * Se o formulário está completo o bastante para valer a pena enviar.
 *
 * Isto não é validação — é a checagem de que os campos obrigatórios foram
 * preenchidos. Se o documento é válido, quem diz é o servidor.
 */
export function faltaPreencher(d: DadosFiscaisEntrada): boolean {
  return (
    !d.documento.trim() ||
    d.razaoSocial.trim().length < 2 ||
    !d.cep.trim() ||
    d.logradouro.trim().length < 2 ||
    !d.numero.trim() ||
    d.bairro.trim().length < 2 ||
    d.cidade.trim().length < 2 ||
    !d.uf
  )
}

export const dadosFiscaisApi = {
  /** `null` significa "ainda não preencheu" — estado legítimo, não erro. */
  get: () => api.get<{ data: DadosFiscais | null }>('/dados-fiscais'),
  salvar: (dados: DadosFiscaisEntrada) =>
    api.put<{ data: DadosFiscais }>('/dados-fiscais', dados),
  remover: () => api.delete('/dados-fiscais'),
}
