export type AprovacaoConfig = {
  exigirAprovacaoDesigner: boolean;          // default: true
  aprovadoresClienteIds: string[];           // múltiplos clientes
  todosAprovadoresSaoObrigatorios: boolean;  // default: true
  permitirOverrideOwner: boolean;            // default: true
  prazoAprovacaoDias?: number | null;        // opcional
};

export type ParticipantesConfig = {
  designersAdicionaisIds: string[];          // opcional
  clientesAdicionaisIds: string[];           // além do cliente principal
};

export type ProjetoExtraPayload = {
  aprovacao?: AprovacaoConfig;
  participantes?: ParticipantesConfig;
};
