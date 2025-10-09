// components/viewer/types.ts

export type ArtePreview = {
  id: string;
  nome: string;
  arquivo: string; // URL resolvida
  largura_px?: number | null;
  altura_px?: number | null;
  versao: number;
  status: string | null;
  tipo?: string | null;
  projeto_id?: string | null;
};

export type FeedbackItem = {
  id: string;
  conteudo: string | null;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  arte_versao_id: string | null;
  posicao_x: number | null;
  posicao_y: number | null;
  posicao_x_abs?: number | null;
  posicao_y_abs?: number | null;
  status: string | null;
  criado_em: string;
  autor_nome?: string | null;
  autor_email?: string | null;
};

export type Versao = {
  id: string | null;
  numero: number;
  criado_em: string;
  status: string | null;
};

export type Aprovacao = {
  id: string;
  arte_versao_id: string;
  aprovador_email: string;
  aprovador_nome?: string | null;
  visto_em?: string | null;
  aprovado_em?: string | null;
};

export type AprovacoesByVersao = Record<string, Aprovacao[]>;

export type ViewerIdentity = {
  email: string;
  nome?: string | null;
};
