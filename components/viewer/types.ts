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

/*
 * UM tipo para o feedback, não dois.
 *
 * Existiam duas declarações com este nome — uma aqui, frouxa (`status: string
 * | null`, mais os campos `posicao_*_abs` que ninguém nunca leu), e outra no
 * viewer, estrita. A página montava o objeto contra a frouxa e por isso
 * escrevia `status: 'PENDENTE'`, valor que sequer existe na união da outra.
 * Duas cópias da mesma verdade divergem; esta é a que ficou.
 */
export type FeedbackItem = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  transcricao?: string | null;
  // derivado de resolvidoEm — o schema não guarda estados intermediários
  status: "ABERTO" | "RESOLVIDO";
  criado_em: string;
  autor_id?: string | null;
  autor_nome?: string | null;
  autor_email?: string | null;
  arte_versao_id?: string | null;
  /**
   * A versão da arte em que este comentário foi feito — cláusula 3.2 do anexo,
   * que define rodada como o conjunto de feedbacks sobre uma mesma versão.
   * `null` em comentário anterior ao campo; a tela diz isso em vez de chutar.
   */
  versao_numero?: number | null;
  posicao_x?: number | null;
  posicao_y?: number | null;
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

/*
 * Mora aqui, e não junto do tipo em FeedbackViewer, por uma razão de Next: o
 * viewer é um módulo `"use client"`, e função exportada de módulo cliente não
 * pode ser CHAMADA por componente de servidor — só renderizada como
 * componente ou passada como prop. A página do viewer é servidor e precisa
 * converter a lista antes de entregá-la, então o conversor tem que viver num
 * módulo neutro. O typecheck passa de qualquer jeito; quem reclama é o
 * servidor, em tempo de execução, com a tela inteira virando error boundary.
 */

/**
 * O feedback como o backend devolve, no formato que a tela lê.
 *
 * O servidor fala camelCase e aninha o autor (`autor: { nome, email }`); a
 * lista lê snake_case e plano. A conversão existia só na página, e o
 * comentário recém-enviado entrava na lista por um `as FeedbackItem` cru —
 * sem autor e sem data. Aparecia na hora como "Anônimo" e "Invalid Date", e
 * só virava gente de verdade depois de recarregar a página.
 *
 * Com vários pins seguidos isso deixou de ser detalhe: é o que a pessoa vê a
 * cada comentário que escreve.
 *
 * O padrão de `status` é "ABERTO" e não "PENDENTE": "PENDENTE" sequer existe
 * na união do tipo. Passava batido porque a página montava o objeto a partir
 * de um `any`, sem ninguém conferir contra o tipo declarado.
 */
export function paraFeedbackItem(f: any): FeedbackItem {
  return {
    id: f.id,
    conteudo: f.conteudo,
    tipo: f.tipo,
    arquivo: f.arquivo ?? null,
    transcricao: f.transcricao ?? null,
    status: f.status === "RESOLVIDO" ? "RESOLVIDO" : "ABERTO",
    criado_em: f.criadoEm ?? f.criado_em ?? new Date().toISOString(),
    autor_id: f.autorId ?? f.autor_id ?? null,
    autor_nome: f.autor?.nome ?? f.autor_nome ?? f.guestNome ?? null,
    autor_email: f.autor?.email ?? f.autor_email ?? f.guestEmail ?? null,
    arte_versao_id: f.arteVersaoId ?? f.arte_versao_id ?? null,
    // Sobre qual versão o comentário foi feito (cláusula 3.2). Nulo em
    // comentário anterior ao campo — e nulo fica nulo: preencher por dedução
    // produziria um palpite indistinguível de um registro.
    versao_numero: f.versaoNumero ?? f.versao_numero ?? null,
    posicao_x: f.posicaoX ?? f.posicao_x ?? null,
    posicao_y: f.posicaoY ?? f.posicao_y ?? null,
  };
}
