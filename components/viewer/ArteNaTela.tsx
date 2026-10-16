"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ErroDeConsulta from "@/components/layout/ErroDeConsulta";
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
  const [todosFeedbacks, setTodosFeedbacks] = useState(() => (d.feedbacks ?? []).map(paraFeedbackItem));
  const [numero, setNumero] = useState<number | null>(null);
  const [versoesReais, setVersoesReais] = useState<Array<{id: string; numero: number; arquivoUrl: string | null; tipo: string; descricao?: string | null; criadoEm: string}>>([]);
  const [erroHistorico, setErroHistorico] = useState(false);
  const carregar = useCallback(async () => {
    try {
      const path = token ? `/preview/${encodeURIComponent(token)}/versoes` : `/artes/${encodeURIComponent(d.arte.id)}/versoes`;
      const res = await api.get<{ data: typeof versoesReais }>(path);
      setVersoesReais(res.data);
      setErroHistorico(false);
    } catch { setErroHistorico(true); }
  }, [token, d.arte.id]);
  useEffect(() => { void carregar(); }, [carregar]);
  const historica = numero !== null && numero !== d.arte.versao;
  const selecionada = versoesReais.find(v => v.numero === numero);
  const arte = historica && selecionada ? { ...d.arte, arquivo: '', previewUrl: selecionada.arquivoUrl, tipo: selecionada.tipo, versao: selecionada.numero, status: null } : d.arte;

  const guardarFeedbacks = useCallback((novos: ReturnType<typeof paraFeedbackItem>[]) => {
    setTodosFeedbacks((anteriores: ReturnType<typeof paraFeedbackItem>[]) => {
      const ids = new Set(novos.map(f => f.id));
      return [...anteriores.filter(f => !ids.has(f.id) && f.versao_numero !== arte.versao && !(f.versao_numero === null && arte.versao === 1)), ...novos];
    });
  }, [arte.versao]);
  const feedbacks = todosFeedbacks.filter((fb: ReturnType<typeof paraFeedbackItem>) => fb.versao_numero === arte.versao || (fb.versao_numero === null && arte.versao === 1));

  // `canComment` nunca existiu: GET /preview/:token devolve
  // { somenteLeitura, acessos, arte, feedbacks }. Como `!undefined` é sempre
  // true, TODO link ficava em modo leitura — o cliente nunca conseguiu
  // comentar por link, que é a promessa central do produto. Quem decide é o
  // somenteLeitura do link, e o backend ja recusa feedback nele (403).
  const readOnly = historica || Boolean(d.somenteLeitura);

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

  if (!arteForClient.arquivo && !historica) {
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
    <div className="flex h-[100dvh] flex-col">
      <div className="shrink-0 border-b bg-background px-4 py-2 space-y-2">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Histórico de versões
          <select aria-label="Versão exibida" className="rounded border bg-background px-2 py-1" value={numero ?? d.arte.versao} onChange={e => setNumero(Number(e.target.value))}>
            <option value={d.arte.versao}>v{d.arte.versao} · Atual</option>
            {versoesReais.filter(v => v.numero !== d.arte.versao).map(v => <option key={v.id} value={v.numero}>v{v.numero} · {new Date(v.criadoEm).toLocaleDateString('pt-BR')}</option>)}
          </select>
        </label>
        {historica && <p className="text-sm font-medium">Versão anterior · somente consulta. Volte à versão atual para comentar ou decidir.</p>}
        {(selecionada ?? versoesReais.find(v => v.numero === d.arte.versao))?.descricao && <p className="text-sm text-muted-foreground">O que mudou: {(selecionada ?? versoesReais.find(v => v.numero === d.arte.versao))?.descricao}</p>}
        {erroHistorico && <ErroDeConsulta mensagem="Não foi possível carregar o histórico de versões." tentar={carregar} />}
        {d.erroFeedbacks && <ErroDeConsulta mensagem="Não foi possível carregar os comentários." tentar={() => window.location.reload()} />}
      </div>
      <div className="min-h-0 flex-1">
    {!arteForClient.arquivo ? <ErroDeConsulta mensagem="Não foi possível abrir o arquivo desta versão." tentar={carregar} /> : <ViewerShell
      key={`${arte.id}-${arte.versao}`}
      historica={historica}
      arte={arteForClient}
      initialFeedbacks={feedbacks}
      onFeedbacksChange={guardarFeedbacks}
      versoes={versoes}
      aprovacoesByVersao={{}}
      readOnly={readOnly}
      token={token}
      /* Cláusula 7.1 do anexo: quem abre o link é quem vai usar a peça, e o
         uso só é licenciado depois da quitação. Vem calculado do backend a
         partir das faturas do projeto. */
      licenca={d.licenca ?? null}
    />}
      </div>
    </div>
  );
}
