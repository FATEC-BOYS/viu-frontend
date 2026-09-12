// components/viewer/ViewerShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { perfilEmCache, temSessao } from "@/lib/api";
import FeedbackViewer from "@/components/viewer/FeedbackViewer";
import ApprovalsPanel from "@/components/viewer/ApprovalsPanel";
import { rotuloArte } from "@/lib/rotulos";

/**
 * A mesa onde o cliente olha a arte.
 *
 * Isto era uma página: faixa laranja de 80px que não dizia nada, dois cartões
 * arredondados lado a lado, e a arte — o assunto — espremida num `max-h-[70vh]`
 * dentro de uma caixa dentro de um `max-w-7xl`. No celular sobrava uma imagem
 * do tamanho de uma linha e três telas de formulário embaixo.
 *
 * Pior: a lista de feedback aparecia duas vezes. `FeedbackViewer` já trazia o
 * campo de texto, o "Gravar áudio" e a lista abaixo da imagem, e a coluna da
 * direita montava `FeedbackPanel`, que é outra lista da mesma coisa — alimentada
 * com `versoes` sintética de um item só e `aprovacoesByVersao` vazio. Sobrou uma
 * superfície só; o que o painel tinha de próprio (ouvir o comentário) o viewer
 * já fazia.
 *
 * Agora a arte ocupa o que sobra da altura, flutuando sobre cinza neutro, e a
 * moldura encolheu ao que precisa existir: uma faixa fina em cima dizendo o que
 * é e quem está falando, e a trilha de comentários ao lado.
 */

type Arte = {
  id: string;
  nome: string;
  arquivo: string;
  largura_px?: number | null;
  altura_px?: number | null;
  versao: number;
  status: string | null;
  tipo: string | null;
  projeto_id: string | null;
};

type Props = {
  arte: Arte;
  initialFeedbacks: any[];
  versoes: { id: string | null; numero: number; criado_em: string; status: string | null }[];
  aprovacoesByVersao: Record<string, any[]>;
  readOnly: boolean;
  token: string;
};

export default function ViewerShell({ arte, initialFeedbacks, readOnly, token }: Props) {
  /**
   * Sessão decide o que a interface pode prometer.
   *
   * Ler pelo link é público, mas comentar exige conta (Feedback.autorId é
   * obrigatório com FK) e aprovar exige ainda ser o cliente do projeto.
   *
   * Começa `false` e só sobe no efeito: no servidor não há localStorage, e
   * decidir na primeira renderização daria divergência de hidratação.
   */
  const [temConta, setTemConta] = useState(false);
  const [viewer, setViewer] = useState<{ email: string; nome: string | null } | null>(null);

  const statusLabel = useMemo(() => rotuloArte(arte.status), [arte.status]);

  useEffect(() => {
    // `temSessao` e não `perfilEmCache`: ter sessão não pode depender de o
    // perfil em cache trazer id. Quem decide o acesso é o cookie; o perfil só
    // alimenta a etiqueta de quem está comentando.
    setTemConta(temSessao());
    const perfil = perfilEmCache();
    setViewer(perfil ? { email: perfil.email ?? "", nome: perfil.nome ?? null } : null);
  }, []);

  const situacao = readOnly
    ? "Somente leitura"
    : !temConta
      ? "Entre na sua conta para comentar"
      : viewer?.email
        ? `Comentando como ${viewer.email}`
        : "Comentando com sua conta";

  return (
    /*
     * `100dvh` e não `100vh`: no navegador do celular a barra de endereço
     * entra e sai, e com `vh` a arte ficava cortada por baixo justamente no
     * aparelho em que o cliente abre o link.
     */
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {/* A faixa de cima: uma linha, não um banner. */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5">
        <h1 className="flex min-w-0 items-baseline gap-2 text-sm font-semibold tracking-tight">
          <span className="truncate">{arte.nome}</span>
          <span className="shrink-0 font-mono text-xs font-normal text-muted-foreground">
            v{arte.versao}
          </span>
        </h1>

        {statusLabel && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {statusLabel}
          </span>
        )}

        <p className="ml-auto truncate text-xs text-muted-foreground">{situacao}</p>
      </header>

      {/* `min-h-0` deixa o filho encolher dentro do flex — sem isto a área da
          arte cresce com o conteúdo e empurra a página para fora da tela. */}
      <div className="min-h-0 flex-1">
        <FeedbackViewer
          arte={arte}
          initialFeedbacks={initialFeedbacks}
          viewer={viewer}
          readOnly={readOnly}
          token={token}
          /* Aprovar exige sessão e ser o cliente do projeto. Sem conta a aba
             inteira sai, em vez de existir para devolver 401. */
          aprovacoes={temConta ? <ApprovalsPanel arteId={arte.id} token={token} /> : null}
        />
      </div>
    </main>
  );
}
