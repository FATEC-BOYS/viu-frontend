import { api } from './api'

export type Plano = {
  id: string
  nome: string
  tipo: 'DESIGNER' | 'CLIENTE'
  precoMensal: number
  precoMensalFormatado: string
  taxaPlataforma: number
  // nome vindo de GET /planos — o front lia taxaPlataformaPercent, que não
  // existe no payload, e a UI mostrava "Taxa reduzida ()"
  taxaPlataformaFormatada: string
  precoAnual?: number | null
  precoAnualFormatado?: string | null
  limitesProjetos?: number | null
  limitesArtes?: number | null
  limitesStorageMb?: number | null
  descricao?: string | null
  ativo: boolean
}

/** O que o formulário de plano envia. Dinheiro em centavos, taxa em fração. */
export type PlanoEntrada = {
  nome: string
  tipo: 'DESIGNER' | 'CLIENTE'
  precoMensal: number
  precoAnual?: number | null
  taxaPlataforma?: number
  limitesProjetos?: number | null
  limitesArtes?: number | null
  limitesStorageMb?: number | null
  descricao?: string | null
  ativo?: boolean
}

export type AssinaturaStatus = 'PENDENTE' | 'ATIVA' | 'CANCELADA' | 'PAUSADA' | 'EXPIRADA'

export type Assinatura = {
  id: string
  status: AssinaturaStatus
  periodoInicio?: string | null
  periodoFim?: string | null
  renovacaoAutomatica: boolean
  plano: Plano
}

export type FaturaStatus = 'PENDENTE' | 'PAGA' | 'CANCELADA' | 'ESTORNADA'

export type TentativaDePagamento = {
  id: string
  status: 'PENDENTE' | 'PROCESSANDO' | 'APROVADO' | 'REJEITADO' | 'CANCELADO' | 'ESTORNADO'
  metodoPagamento?: string | null
  expiraEm?: string | null
}

export type Fatura = {
  id: string
  valor: number
  valorFormatado: string
  /*
   * A quebra entre taxa e líquido é opcional porque o servidor só a manda para
   * quem ela diz respeito: designer e admin. Para o cliente, que paga o total,
   * os campos não vêm — e é por isso que são opcionais aqui em vez de a tela
   * escondê-los: escondido no componente, o número continuaria na resposta.
   */
  taxaPlataforma?: number
  taxaPlataformaFormatada?: string
  valorLiquidoDesigner?: number
  valorLiquidoDesignerFormatado?: string
  status: FaturaStatus
  dataVencimento?: string | null
  dataPagamento?: string | null
  /*
   * Datas já formatadas pelo servidor. A tela reimplementava `toLocaleDateString`
   * por cima de `dataVencimento` enquanto estas vinham prontas e ignoradas.
   */
  dataVencimentoFormatada?: string | null
  dataPagamentoFormatada?: string | null
  /*
   * Prazo estourado e ninguém pagou. Vem do servidor, que tem a data e o
   * relógio: comparar no navegador é comparar com um relógio que pode estar em
   * outro fuso ou simplesmente errado.
   */
  vencida?: boolean
  descricao?: string | null
  projeto: { id: string; nome: string }
  cliente: { id: string; nome: string }
  designer: { id: string; nome: string }
  /** Tentativas de pagamento, da mais recente para a mais antiga. */
  pagamentos?: TentativaDePagamento[]
}

export type ChavePixTipo = 'CPF' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA'

export type ChavePix = {
  id: string
  tipo: ChavePixTipo
  chave: string
  titular: string
  ativa: boolean
}

export type SaqueStatus = 'SOLICITADO' | 'PROCESSANDO' | 'CONCLUIDO' | 'REJEITADO'

export type Saque = {
  id: string
  valor: number
  valorFormatado: string
  status: SaqueStatus
  criadoEm: string
  chavePix: ChavePix
}

export type SaldoInfo = {
  // nomes vindos de GET /saques/saldo — antes o front lia saldo,
  // que não existe no payload, e o card mostrava "R$ NaN"
  saldo: number
  saldoFormatado: string
  totalRecebido: number
  totalRecebidoFormatado: string
  totalSacado: number
  totalSacadoFormatado: string
  // Valor travado por disputa em aberto. Já vem descontado de `saldo`; existe
  // separado para a interface poder explicar a diferença em vez de o número
  // encolher sem motivo aparente.
  saldoBloqueado: number
  saldoBloqueadoFormatado: string
  /*
   * O mínimo de saque, dito pelo servidor.
   *
   * A tela tinha a própria cópia (`valor < 500`) e a própria frase ("Mínimo
   * R$ 5,00"). Duas fontes para uma regra só: mudar lá deixaria a tela
   * recusando um valor que o servidor aceita, ou prometendo um que ele recusa.
   */
  valorMinimo: number
  valorMinimoFormatado: string
}

/**
 * Lançamento do extrato financeiro (GET /ledger).
 *
 * CREDITO nasce de fatura paga, DEBITO de saque concluído; `referencia` é
 * "fatura:<id>" ou "saque:<id>". É a fonte da verdade do saldo — os totais de
 * GET /saques/saldo saem daqui.
 */
export type LedgerEntry = {
  id: string
  tipo: 'CREDITO' | 'DEBITO'
  valor: number
  descricao: string
  referencia?: string | null
  criadoEm: string
}

export type PixPaymentResult = {
  pagamentoId: string
  qrCode: string
  qrCodeText: string
  /*
   * Quando o QR deixa de valer, como o gateway informou — nulo para tentativas
   * antigas, anteriores a o prazo passar a ser guardado. Era recalculado como
   * `agora + 24h` a cada resposta, então quem reabria a tela lia sempre um
   * prazo novo, independentemente de quando o QR nasceu.
   */
  expiraEm: string | null
}

export function formatReais(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

export const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  ATIVA: 'Ativa',
  CANCELADA: 'Cancelada',
  PAUSADA: 'Pausada',
  EXPIRADA: 'Expirada',
  PAGA: 'Paga',
  ESTORNADA: 'Estornada',
  SOLICITADO: 'Solicitado',
  PROCESSANDO: 'Processando',
  CONCLUIDO: 'Concluído',
  REJEITADO: 'Rejeitado',
}

export const CHAVE_PIX_LABELS: Record<ChavePixTipo, string> = {
  CPF: 'CPF',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave aleatória',
}

export const pagamentosApi = {
  getPlanos: (tipo?: string) =>
    api.get<{ data: Plano[] }>(`/planos${tipo ? `?tipo=${tipo}` : ''}`),

  /**
   * A lista do administrador, com os inativos junto.
   *
   * `GET /planos` é público e sempre escondeu plano inativo — certo para quem
   * vai assinar, errado para quem administra: desativar tirava o plano da
   * própria tela que o desativou.
   */
  getPlanosAdmin: () => api.get<{ data: Plano[] }>('/planos/todos'),

  criarPlano: (dados: PlanoEntrada) => api.post<{ data: Plano }>('/planos', dados),

  atualizarPlano: (id: string, dados: Partial<PlanoEntrada>) =>
    api.put<{ data: Plano }>(`/planos/${id}`, dados),

  getMinhaAssinatura: () =>
    api.get<{ data: Assinatura | null }>('/assinaturas/minha'),

  assinar: (planoId: string) =>
    api.post<{ data: { assinatura?: Assinatura; checkoutUrl?: string } }>('/assinaturas', { planoId }),

  cancelarAssinatura: (id: string) =>
    api.put<{ success: boolean }>(`/assinaturas/${id}/cancelar`, {}),

  /**
   * `tipo` não é quem o usuário é — é de que lado da fatura ele está:
   * 'cliente' filtra por clienteId (o que ele paga), 'designer' por designerId
   * (o que ele recebe). O default 'cliente' devolvia a lista errada em
   * silêncio para quem esquecesse o argumento, e foi assim que a tela de
   * Faturas passou a abrir sempre no lado de quem paga. Sem default: quem
   * chama decide, e erra alto.
   */
  getFaturas: (tipo: 'cliente' | 'designer', projetoId?: string) => {
    const p = new URLSearchParams({ tipo })
    // `projetoId` estreita no servidor. Filtrar a lista inteira no navegador
    // esconderia o que não coubesse nela sem dizer que estava escondendo.
    if (projetoId) p.set('projetoId', projetoId)
    return api.get<{ data: Fatura[] }>(`/faturas?${p.toString()}`)
  },

  getFatura: (id: string) =>
    api.get<{ data: Fatura }>(`/faturas/${id}`),

  /**
   * Cancela uma fatura. Só sai de PENDENTE: a máquina de estados do backend
   * leva PAGA para ESTORNADA, nunca para CANCELADA — dinheiro que entrou se
   * devolve, não se apaga.
   */
  cancelarFatura: (faturaId: string) =>
    api.delete<{ success: boolean }>(`/faturas/${faturaId}`),

  /** Gera a fatura do projeto. Devolve a fatura criada, com id. */
  gerarFaturaDoProjeto: (projetoId: string) =>
    api.post<{ data: Fatura }>(`/projetos/${projetoId}/fatura`, {}),

  pagarPix: (faturaId: string, cpf: string) =>
    api.post<{ data: PixPaymentResult }>(`/faturas/${faturaId}/pagar/pix`, { cpf }),

  getPagamentos: () =>
    api.get<{ data: unknown[] }>('/pagamentos'),

  getSaldo: () =>
    api.get<{ data: SaldoInfo }>('/saques/saldo'),

  /** Extrato do próprio usuário; ADMIN pode passar o id de um designer. */
  getLedger: (designerId?: string) =>
    api.get<{ data: LedgerEntry[] }>(designerId ? `/ledger/${designerId}` : '/ledger'),

  getSaques: () =>
    api.get<{ data: Saque[] }>('/saques'),

  getChavesPix: () =>
    api.get<{ data: ChavePix[] }>('/chaves-pix'),

  cadastrarChavePix: (data: { tipo: string; chave: string; titular: string }) =>
    api.post<{ data: ChavePix }>('/chaves-pix', data),

  removerChavePix: (id: string) =>
    api.delete<{ success: boolean }>(`/chaves-pix/${id}`),

  solicitarSaque: (chavePixId: string, valor: number) =>
    api.post<{ data: Saque }>('/saques', { chavePixId, valor }),
}
