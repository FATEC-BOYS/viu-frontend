import { api } from './api'

/**
 * Os termos comerciais do projeto — cláusulas 3.1, 4.1 e 7.2 do anexo de
 * revisão.
 *
 * Eram lacunas num PDF (`[N] rodadas`, `Território: ____`). Lacuna em PDF fica
 * em branco; campo em formulário é preenchido, porque a fatura avisa quando
 * falta. E preenchido como dado, o produto consegue dizer "exclusividade até
 * 13/03/2027" na tela em vez de guardar um anexo que ninguém abre.
 */

export type LicencaPrazo = 'INDETERMINADO' | 'ATE_DATA'
export type ArquivosFonte = 'NAO_INCLUSOS' | 'INCLUSOS_APOS_QUITACAO' | 'TAXA_EXTRA'

export interface TermosProjeto {
  id: string
  projetoId: string
  rodadasIncluidas: number | null
  prazoRevisaoDiasUteis: number | null
  licencaFinalidade: string | null
  licencaTerritorio: string | null
  licencaPrazo: LicencaPrazo | null
  licencaPrazoAte: string | null
  exclusividade: boolean | null
  exclusividadeAte: string | null
  arquivosFonte: ArquivosFonte | null
  criadoEm: string
  atualizadoEm: string
}

/** Os campos que precisam estar preenchidos para o anexo fazer sentido. */
export type CampoTermo =
  | 'rodadasIncluidas'
  | 'prazoRevisaoDiasUteis'
  | 'licencaFinalidade'
  | 'licencaTerritorio'
  | 'licencaPrazo'
  | 'exclusividade'
  | 'arquivosFonte'

export interface RespostaTermos {
  data: TermosProjeto | null
  completos: boolean
  /**
   * O que falta, vindo do backend.
   *
   * Não recalculado aqui de propósito: a regra vive em `camposFaltantes()`, no
   * serviço. Duas listas — uma na tela, outra no portão — divergiriam no
   * primeiro campo novo, e o aviso diria "tudo certo" enquanto a fatura
   * recusasse.
   */
  faltam: CampoTermo[]
}

export interface TermosEntrada {
  rodadasIncluidas?: number | null
  prazoRevisaoDiasUteis?: number | null
  licencaFinalidade?: string | null
  licencaTerritorio?: string | null
  licencaPrazo?: LicencaPrazo | null
  licencaPrazoAte?: string | null
  exclusividade?: boolean | null
  exclusividadeAte?: string | null
  arquivosFonte?: ArquivosFonte | null
}

export interface PreviaAnexo {
  texto: string
  templateVersao: string
  /** Falso enquanto o texto não passar por advogado. A tela lê daqui. */
  revisadoJuridicamente: boolean
  completos: boolean
  faltam: CampoTermo[]
}

export const termosApi = {
  async get(projetoId: string): Promise<RespostaTermos> {
    return api.get<RespostaTermos>(`/projetos/${projetoId}/termos`)
  },

  async salvar(projetoId: string, entrada: TermosEntrada): Promise<RespostaTermos> {
    return api.put<RespostaTermos>(`/projetos/${projetoId}/termos`, entrada)
  },

  async previa(projetoId: string): Promise<PreviaAnexo> {
    const res = await api.get<{ data: PreviaAnexo }>(`/projetos/${projetoId}/anexo/preview`)
    return res.data
  },
}

/** O nome de cada campo em português, para a tela dizer o que falta. */
export const ROTULO_CAMPO: Record<CampoTermo, string> = {
  rodadasIncluidas: 'rodadas de revisão por entrega',
  prazoRevisaoDiasUteis: 'prazo do cliente para revisar',
  licencaFinalidade: 'onde a peça pode ser usada',
  licencaTerritorio: 'território da licença',
  licencaPrazo: 'até quando a licença vale',
  exclusividade: 'exclusividade',
  arquivosFonte: 'arquivos-fonte',
}

export const ROTULO_ARQUIVOS_FONTE: Record<ArquivosFonte, string> = {
  NAO_INCLUSOS: 'Não inclusos',
  INCLUSOS_APOS_QUITACAO: 'Inclusos após a quitação',
  TAXA_EXTRA: 'Mediante taxa extra',
}

/**
 * "falta o território e a exclusividade" — uma frase, não uma lista de chaves
 * de banco. Sem isto a tela mostraria `licencaTerritorio` para o designer.
 */
export function frasedoQueFalta(faltam: CampoTermo[]): string {
  const nomes = faltam.map((c) => ROTULO_CAMPO[c])
  if (nomes.length === 0) return ''
  if (nomes.length === 1) return nomes[0]
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}
