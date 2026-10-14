"use client";

import ViewerShell from "@/components/viewer/ViewerShell";
import { paraFeedbackItem } from "@/components/viewer/types";

/**
 * A tela da arte, alimentada por qualquer uma das duas origens.
 *
 * Morava dentro de `app/viewer/arte/[id]/page.tsx`, que é server component.
 * Saiu de lá porque as duas origens deixaram de ser as duas metades de uma
 * página só: o link por token continua resolvido no servidor (é leitura
 * pública, não precisa de cookie), e a arte pela própria conta passou a ser
 * buscada pelo NAVEGADOR — que é o único que tem o cookie da sessão quando a
 * API mora em outro domínio.
 *
 * Com as duas montando a mesma tela, o que elas precisam compartilhar é
 * exatamente isto: o formato que o `ViewerShell` consome.
 */
export default function ArteNaTela({ token, d }: { token: string; d: any }) {
  const arte = d.arte;

  const feedbacks = (d.feedbacks ?? []).map(paraFeedbackItem);

  // `canComment` nunca existiu: GET /preview/:token devolve
  // { somenteLeitura, acessos, arte, feedbacks }. Como `!undefined` é sempre
  // true, TODO link ficava em modo leitura — o cliente nunca conseguiu
  // comentar por link, que é a promessa central do produto. Quem decide é o
  // somenteLeitura do link, e o backend ja recusa feedback nele (403).
  const readOnly = Boolean(d.somenteLeitura);

  const arteForClient = {
    id: arte.id,
    nome: arte.nome,
    arquivo: arte.previewUrl ?? arte.arquivo ?? "",
    largura_px: arte.larguraPx ?? arte.largura_px ?? null,
    altura_px: arte.alturaPx ?? arte.altura_px ?? null,
    versao: arte.versao ?? 1,
    status: arte.status ?? null,
    tipo: arte.tipo ?? null,
    projeto_id: arte.projetoId ?? arte.projeto_id ?? null,
  };

  if (!arteForClient.arquivo) {
    /*
     * Sem URL de exibição não há o que olhar, e este é o único caminho honesto
     * entre mostrar a tela inteira vazia e não mostrar nada. Acontece quando a
     * assinatura do arquivo falha — `signPath` devolve `null` e a arte existe,
     * mas não tem por onde ser vista.
     */
    return (
      <main className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        <header className="flex shrink-0 items-baseline gap-2 border-b px-4 py-2.5">
          <h1 className="truncate text-sm font-semibold tracking-tight">{arte.nome}</h1>
          <span className="font-mono text-xs text-muted-foreground">v{arte.versao}</span>
        </header>
        <div className="grid flex-1 place-items-center bg-canvas p-6 text-center">
          <div className="max-w-sm space-y-1">
            <p className="text-sm font-medium">Não foi possível abrir esta arte</p>
            <p className="text-sm text-muted-foreground">
              Recarregue a página para tentar abrir o arquivo. Se o problema continuar,
              avise quem enviou a arte.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const versoes = [
    {
      id: arte.id,
      numero: arte.versao ?? 1,
      criado_em: arte.criadoEm ?? arte.criado_em ?? new Date().toISOString(),
      status: arte.status ?? null,
    },
  ];

  return (
    <ViewerShell
      arte={arteForClient}
      initialFeedbacks={feedbacks}
      versoes={versoes}
      aprovacoesByVersao={{}}
      readOnly={readOnly}
      token={token}
      /* Cláusula 7.1 do anexo: quem abre o link é quem vai usar a peça, e o
         uso só é licenciado depois da quitação. Vem calculado do backend a
         partir das faturas do projeto. */
      licenca={d.licenca ?? null}
    />
  );
}
