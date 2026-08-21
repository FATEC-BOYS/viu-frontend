"use client";
import type { ProjetoStatus } from "@/lib/projects";

// Os status editáveis pela interface são os mesmos do backend. RASCUNHO e
// CANCELADO não são escolhidos aqui — quem os define é o fluxo de convite —,
// mas precisam existir no tipo para não se perderem ao editar o projeto.
export type StatusProjeto = ProjetoStatus;
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
