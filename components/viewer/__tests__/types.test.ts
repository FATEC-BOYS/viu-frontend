import { describe, expect, it } from "vitest";
import { paraFeedbackItem, ehAudio } from "../types";

/**
 * O conversor que fica entre o backend e a tela — e onde o áudio se perdia.
 *
 * Não havia teste nenhum aqui, e era aqui que o defeito morava: o backend
 * mandava a URL assinada em `arquivo_url` e este conversor copiava `arquivo`,
 * que é a CHAVE do bucket. O `<audio src="feedbacks/…">` resolvia contra a
 * origem da página e dava 404 — medido no link público:
 *
 *   src resolvido: localhost:3000/viewer/arte/feedbacks/…/gravacao.webm → 404
 *
 * Os testes do viewer passavam porque as fixturas dele já traziam uma URL
 * pronta em `arquivo`, forma que o backend nunca mandou. O contrato real é o
 * destes testes.
 */

/** Como o backend devolve de fato um comentário em áudio. */
function doBackend(over: Record<string, unknown> = {}) {
  return {
    id: "cfb1",
    conteudo: "O azul do fundo ficou pesado",
    tipo: "AUDIO",
    arquivo: "feedbacks/carte1/1760000000000_gravacao.webm",
    arquivo_url:
      "https://r2.exemplo/feedbacks/carte1/1760000000000_gravacao.webm?X-Amz-Signature=abc",
    transcricao: "O azul do fundo ficou pesado",
    criadoEm: "2026-10-12T16:00:00.000Z",
    autor: { nome: "João", email: "joao@empresa.com" },
    ...over,
  };
}

describe("paraFeedbackItem — o endereço do áudio", () => {
  it("usa a URL assinada, e não a chave do bucket", () => {
    const fb = paraFeedbackItem(doBackend());
    expect(fb.arquivo).toBe(
      "https://r2.exemplo/feedbacks/carte1/1760000000000_gravacao.webm?X-Amz-Signature=abc",
    );
  });

  /*
   * A chave crua nunca pode virar o `src`: é relativa, então o navegador a
   * resolve contra a página. Era esse o bug, e é esta a asserção que o pega.
   */
  it("o resultado nunca é um caminho relativo", () => {
    const fb = paraFeedbackItem(doBackend());
    expect(fb.arquivo).not.toBe("feedbacks/carte1/1760000000000_gravacao.webm");
    expect(fb.arquivo?.startsWith("http")).toBe(true);
  });

  /*
   * Sem `arquivo_url` ainda se usa `arquivo` — não por ser bom, mas porque
   * calar perderia a informação de que existe uma gravação. É o mesmo
   * encadeamento de `arte.previewUrl ?? arte.arquivo`.
   */
  it("cai para a chave quando não vem URL assinada", () => {
    const fb = paraFeedbackItem(doBackend({ arquivo_url: null }));
    expect(fb.arquivo).toBe("feedbacks/carte1/1760000000000_gravacao.webm");
  });

  it("comentário de texto não ganha endereço nenhum", () => {
    const fb = paraFeedbackItem(
      doBackend({ tipo: "TEXTO", arquivo: null, arquivo_url: null }),
    );
    expect(fb.arquivo).toBeNull();
  });
});

describe("ehAudio", () => {
  /*
   * A pergunta é "tem áudio?", e quem responde é o ARQUIVO. O rótulo não
   * serve: `createFeedbackComAudio` gravava `POSICIONAL` para toda gravação
   * feita sobre um ponto da arte, e essas linhas continuam no banco. Com
   * `tipo === "AUDIO"`, o áudio com pino não desenhava player nenhum.
   */
  it("reconhece áudio com rótulo POSICIONAL — o legado do banco", () => {
    const fb = paraFeedbackItem(doBackend({ tipo: "POSICIONAL", posicaoX: 30, posicaoY: 40 }));
    expect(fb.tipo).toBe("POSICIONAL");
    expect(ehAudio(fb)).toBe(true);
  });

  it("reconhece áudio com rótulo AUDIO", () => {
    expect(ehAudio(paraFeedbackItem(doBackend()))).toBe(true);
  });

  it("não chama de áudio um comentário sem arquivo", () => {
    const fb = paraFeedbackItem(
      doBackend({ tipo: "POSICIONAL", arquivo: null, arquivo_url: null }),
    );
    // Pino com texto: tem posição, não tem gravação.
    expect(ehAudio(fb)).toBe(false);
  });
});
