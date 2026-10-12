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
  /**
   * O rótulo do backend, incluindo o legado.
   *
   * `POSICIONAL` está aqui porque EXISTE no banco: `createFeedbackComAudio`
   * gravava esse valor para toda gravação feita sobre um ponto da arte. O
   * backend não escreve mais assim, mas as linhas antigas continuam lá — e
   * declarar só `"TEXTO" | "AUDIO"` não as fazia desaparecer, só fazia o tipo
   * mentir sobre elas.
   *
   * Quem pergunta "isto é áudio?" deve usar `ehAudio`, não este campo.
   */
  tipo: "TEXTO" | "AUDIO" | "POSICIONAL";
  /** O endereço TOCÁVEL do áudio — veja `paraFeedbackItem`. */
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
  /**
   * O comentário ao qual este responde, quando é uma resposta.
   *
   * O campo existe no banco desde a migration de threads e sempre veio no
   * preview do link — o conversor é que o descartava. Sem ele a tela não tem
   * como saber que uma resposta é resposta, então ela entrava na trilha como
   * comentário solto, e por ordenação a resposta aparecia ACIMA do comentário
   * que respondia. Medido no link: "Boa, vou clarear na v2" em cima de "O
   * azul do fundo ficou pesado", sem nada ligando os dois.
   */
  parent_id?: string | null;
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
/**
 * Isto é um comentário em áudio?
 *
 * Tem áudio quem tem ARQUIVO — e não quem o rótulo `tipo` chama de `AUDIO`. A
 * tela perguntava `tipo === "AUDIO"`, e o backend gravava `POSICIONAL` para
 * toda gravação feita sobre um ponto da arte: a resposta era "não é áudio"
 * justamente para o comentário em áudio mais específico que o produto sabe
 * fazer. Medido no link público, com dois áudios na arte: UM elemento
 * `<audio>` na página — o do pino não existia, e nada na tela dizia que havia
 * uma gravação ali.
 *
 * Esta formulação é a mesma do painel de feedbacks (`ehAudio`) e a mesma do
 * `assinarAudioDeFeedback` no backend. Nos três lugares, pela mesma razão.
 */
export function ehAudio(f: Pick<FeedbackItem, "arquivo">): boolean {
  return !!f.arquivo;
}

export function paraFeedbackItem(f: any): FeedbackItem {
  return {
    id: f.id,
    conteudo: f.conteudo,
    tipo: f.tipo,
    /*
     * `arquivo_url` ANTES de `arquivo` — é o que torna o áudio tocável.
     *
     * A coluna `arquivo` guarda a chave do bucket, não um endereço. O backend
     * manda a URL assinada ao lado, em `arquivo_url`, e este conversor a
     * descartava: o `<audio src="feedbacks/…">` resolvia contra a origem da
     * página e dava 404. Medido no link público:
     *
     *   src resolvido: localhost:3000/viewer/arte/feedbacks/…/gravacao.webm
     *   resposta:      404
     *
     * No MESMO payload vinha `arquivo_url` assinada e correta. É a mesma
     * precedência que `arte.previewUrl ?? arte.arquivo` já usa para a imagem
     * da arte — foi exatamente este bug, e o áudio não tinha recebido o
     * conserto equivalente.
     */
    arquivo: f.arquivo_url ?? f.arquivo ?? null,
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
    parent_id: f.parentId ?? f.parent_id ?? null,
  };
}
