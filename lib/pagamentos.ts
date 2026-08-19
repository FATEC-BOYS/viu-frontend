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

export type Fatura = {
  id: string
  valor: number
  valorFormatado: string
  taxaPlataforma: number
  taxaPlataformaFormatada: string
  valorLiquidoDesigner: number
  valorLiquidoDesignerFormatado: string
  status: FaturaStatus
  dataVencimento?: string | null
  dataPagamento?: string | null
  descricao?: string | null
  projeto: { id: string; nome: string }
  cliente: { id: string; nome: string }
  designer: { id: string; nome: string }
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
}

export type PixPaymentResult = {
  pagamentoId: string
  qrCode: string
  qrCodeText: string
  expiraEm: string
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

  getMinhaAssinatura: () =>
    api.get<{ data: Assinatura | null }>('/assinaturas/minha'),

  assinar: (planoId: string) =>
    api.post<{ data: { assinatura?: Assinatura; checkoutUrl?: string } }>('/assinaturas', { planoId }),

  cancelarAssinatura: (id: string) =>
    api.put<{ success: boolean }>(`/assinaturas/${id}/cancelar`, {}),

  getFaturas: (tipo: 'cliente' | 'designer' = 'cliente') =>
    api.get<{ data: Fatura[] }>(`/faturas?tipo=${tipo}`),

  getFatura: (id: string) =>
    api.get<{ data: Fatura }>(`/faturas/${id}`),

  pagarPix: (faturaId: string, cpf: string) =>
    api.post<{ data: PixPaymentResult }>(`/faturas/${faturaId}/pagar/pix`, { cpf }),

  getPagamentos: () =>
    api.get<{ data: unknown[] }>('/pagamentos'),

  getSaldo: () =>
    api.get<{ data: SaldoInfo }>('/saques/saldo'),

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
