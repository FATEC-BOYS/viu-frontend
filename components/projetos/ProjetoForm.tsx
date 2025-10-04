"use client";
export type StatusProjeto = "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
export interface ClienteOption { id: string; nome: string }
export interface UsuarioOption { id: string; nome: string }

export interface ProjetoFormValues {
  nome: string;
  descricao?: string;
  status: StatusProjeto;
  orcamento: number;   // R$
  prazo?: string;      // yyyy-mm-dd
  cliente_id: string | null;
  aprovacao: {
    exigirAprovacaoDesigner: boolean;
    aprovadoresClienteIds: string[];
    todosAprovadoresSaoObrigatorios: boolean;
    permitirOverrideOwner: boolean;
    prazoAprovacaoDias?: number | null;
  };
  participantes: {
    designersAdicionaisIds: string[];
    clientesAdicionaisIds: string[];
  };
}
