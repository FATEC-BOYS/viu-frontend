import { api } from './api'
import type { CampoTermo } from './termos'

/**
 * O anexo de revisão congelado — o documento que as duas partes aceitam.
 *
 * Diferente dos termos, que são estado corrente e mudam quando as partes
 * renegociam: aqui nada muda depois de gerado. `texto` é o que elas leram,
 * palavra por palavra, e `hash` responde por ele. Um aditivo não altera a
 * versão vigente — cria a seguinte, e a anterior fica guardada com os aceites
 * dela.
 */

export type StatusContrato = 'VIGENTE' | 'SUBSTITUIDO'
export type PapelContrato = 'DESIGNER' | 'CLIENTE'

export interface AceiteContrato {
  id: string
  usuarioId: string
  papel: PapelContrato | null
  criadoEm: string
  ip?: string | null
  usuario?: { id: string; nome: string; email: string } | null
}

export interface Contrato {
  id: string
  projetoId: string
  versao: number
  status: StatusContrato
  texto: string
  hash: string
  templateVersao: string
  /** Falso enquanto a redação não passar por advogado. A tela lê daqui. */
  revisadoJuridicamente: boolean
  criadoEm: string
  aceites: AceiteContrato[]
}

export interface EstadoAceite {
  contratoId: string | null
  versao: number | null
  aceitaram: string[]
  /** Os papéis que ainda não aceitaram a versão vigente. */
  faltam: PapelContrato[]
  /**
   * O papel de quem está olhando, calculado no servidor.
   *
   * Nulo para quem não é parte — um ADMIN, por exemplo. A tela usa isto para
   * decidir se oferece o botão de aceitar, em vez de comparar ids por conta
   * própria: errar essa conta significa oferecer um botão que devolve 403.
   */
  meuPapel: PapelContrato | null
  jaAceitei: boolean
}

export interface RespostaContrato {
  data: Contrato | null
  aceite: EstadoAceite
  /** O que falta nos termos para o contrato poder ser gerado. */
  termosFaltantes: CampoTermo[]
}

/** Uma versão na lista de histórico — sem o texto, que é grande. */
export interface VersaoContrato {
  id: string
  versao: number
  status: StatusContrato
  hash: string
  templateVersao: string
  criadoEm: string
  aceites: Array<{ usuarioId: string; papel: PapelContrato | null; criadoEm: string }>
}

export const contratoApi = {
  async vigente(projetoId: string): Promise<RespostaContrato> {
    return api.get<RespostaContrato>(`/projetos/${projetoId}/contrato`)
  },

  async historico(projetoId: string): Promise<VersaoContrato[]> {
    const res = await api.get<{ data: VersaoContrato[] }>(`/projetos/${projetoId}/contrato/versoes`)
    return res.data
  },

  /*
   * `{}` e não nada: o Fastify recusa corpo vazio quando o content-type é JSON
   * (400, "Body cannot be empty"), e o cliente de API sempre manda o header. É
   * a convenção do resto do código.
   */
  async gerar(projetoId: string): Promise<Contrato> {
    const res = await api.post<{ data: Contrato }>(`/projetos/${projetoId}/contrato`, {})
    return res.data
  },

  async aceitar(contratoId: string): Promise<AceiteContrato> {
    const res = await api.post<{ data: AceiteContrato }>(`/contratos/${contratoId}/aceite`, {})
    return res.data
  },
}

export const ROTULO_PAPEL: Record<PapelContrato, string> = {
  DESIGNER: 'designer',
  CLIENTE: 'cliente',
}

/**
 * "falta o cliente aceitar" / "faltam o designer e o cliente aceitarem".
 *
 * Frase e não lista de constantes: `DESIGNER` em caixa alta na tela é o mesmo
 * defeito de mostrar `EM_ANALISE` ao cliente ou o CUID no lugar do nome.
 */
export function frasedeQuemFalta(faltam: PapelContrato[]): string {
  if (faltam.length === 0) return ''
  if (faltam.length === 1) return `Falta o ${ROTULO_PAPEL[faltam[0]]} aceitar.`
  return 'Faltam o designer e o cliente aceitarem.'
}

/**
 * O hash curto que aparece na tela.
 *
 * Doze caracteres bastam para conferir de relance, e o inteiro fica no `title`
 * — é a prova de que o texto não mudou, então precisa ser copiável, não só
 * decorativo.
 */
export function hashCurto(hash: string): string {
  return hash.slice(0, 12)
}
