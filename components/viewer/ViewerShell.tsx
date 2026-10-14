// components/viewer/ViewerShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProjeto } from "@/lib/projects";
import { useAuth } from "@/contexts/AuthContext";
import FeedbackViewer from "@/components/viewer/FeedbackViewer";
import ApprovalsPanel from "@/components/viewer/ApprovalsPanel";
import BarraDecisao from "@/components/viewer/BarraDecisao";
import { useMinhaDecisao } from "@/components/viewer/hooks/useMinhaDecisao";
import { rotuloArte } from "@/lib/rotulos";
import { SeloLicencaCompacto, type Licenca } from "@/components/licenca/SeloLicenca";

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
  /**
   * Estado da licença de uso, da cláusula 7.1 do anexo. `null` quando o projeto
   * não tem fatura: sem cobrança não há o que afirmar sobre licença.
   */
  licenca?: Licenca | null;
};

export default function ViewerShell({
  arte,
  initialFeedbacks,
  readOnly,
  token,
  licenca,
}: Props) {
  /**
   * Sessão decide o que a interface pode prometer.
   *
   * Ler pelo link é público, mas comentar exige conta (Feedback.autorId é
   * obrigatório com FK) e aprovar exige ainda ser o cliente do projeto.
   *
   * Quem responde é o `AuthProvider`, e não mais um `sessaoNoServidor` vindo
   * da página. Aquela resposta era o cookie LIDO PELO SERVIDOR NEXT — e o
   * cookie é gravado pelo backend, que em produção mora em outro domínio.
   * Cookie sem atributo `Domain` é host-only: o navegador só o entrega ao
   * host que o criou, então o servidor Next NUNCA o via e a resposta era
   * sempre `false`. Quem estava logada abria o link e recebia a porta de
   * login no lugar dos próprios controles.
   *
   * O provider não tem esse problema: ele mostra o perfil em cache de
   * imediato e confirma com `/auth/me`, que o navegador chama direto no
   * backend — levando o cookie, porque aí o host confere. Ele começa `null`
   * nos dois lados da hidratação, então a primeira renderização continua
   * casando.
   */
  const { user } = useAuth();
  const temConta = !!user;
  const [podeGerenciar, setPodeGerenciar] = useState(false);
  useEffect(() => {
    let ativo = true;
    setPodeGerenciar(false);
    if (user?.tipo === "DESIGNER" && arte.projeto_id) {
      getProjeto(arte.projeto_id)
        .then(p => { if (ativo) setPodeGerenciar(p.designer.id === user.id); })
        .catch(() => { if (ativo) setPodeGerenciar(false); });
    }
    return () => { ativo = false; };
  }, [user?.id, user?.tipo, arte.projeto_id]);

  const viewer = useMemo(
    () => (user ? { email: user.email ?? "", nome: user.nome ?? null } : null),
    [user],
  );

  const statusLabel = useMemo(() => rotuloArte(arte.status), [arte.status]);

  /*
   * Para onde mandar quem precisa entrar — e de volta para ESTA arte.
   *
   * Calculado no efeito, não na renderização: `window` não existe no servidor,
   * e ler ali daria divergência de hidratação pelo mesmo motivo de `temConta`.
   */
  const [voltarPara, setVoltarPara] = useState<string | null>(null);

  /*
   * As duas portas, montadas no mesmo lugar para não divergirem.
   *
   * `next` carrega a volta para ESTA arte. Sem ele a pessoa entra e cai no
   * dashboard, longe do que o designer pediu para ela olhar — e ela não tem
   * outro endereço para a arte além do link que recebeu.
   */
  const volta = voltarPara ? `?next=${encodeURIComponent(voltarPara)}` : "";
  const urlDeLogin = `/login${volta}`;
  const urlDeCadastro = `/cadastro${volta}`;
  useEffect(() => {
    setVoltarPara(window.location.pathname + window.location.search);
  }, []);

  /*
   * A pendência de quem está olhando mora aqui, e não dentro da barra, porque
   * o painel lateral mostra a mesma linha. Dois donos do mesmo estado fariam a
   * gaveta continuar dizendo "aguardando decisão" depois de decidida na barra
   * — por isso `chaveDoPainel` remonta o painel quando a barra decide.
   */
  const { pendencia, decidir, decidindo } = useMinhaDecisao(arte.id, token);
  const [chaveDoPainel, setChaveDoPainel] = useState(0);

  const decidirEAtualizarPainel = async (
    status: "APROVADO" | "REJEITADO",
    comentario?: string,
  ) => {
    const r = await decidir(status, comentario);
    if (r.ok) setChaveDoPainel((n) => n + 1);
    return r;
  };

  /*
   * Duas perguntas diferentes, que estavam coladas numa só.
   *
   * `readOnly` vem de `somenteLeitura` do link e diz se dá para COMENTAR —
   * e o link que o produto cria nasce assim (o wizard começa com o switch
   * ligado). Só que "Somente leitura" vinha antes de tudo, inclusive de quem
   * não tem sessão: o visitante do link padrão via a frase e nenhuma porta.
   *
   * Quem tem conta lê a situação; quem não tem recebe a porta — com a promessa
   * que o link realmente cumpre. Entrar num link só-leitura continua valendo:
   * é como o cliente chega na própria decisão, que não depende da permissão do
   * link e sim de ser o cliente do projeto.
   */
  const situacao = !temConta
    ? null
    : readOnly
      ? "Somente leitura"
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

        {/* Na faixa e não sobre a arte: o selo informa quem for usar a peça,
            sem tapar o que a pessoa veio ver.

            `contexto="publico"` porque esta tela É o link compartilhado, e
            link é encaminhado. A frase aqui responde "dá para usar?" e para
            aí — sem data de quitação e sem dizer que houve estorno, que é
            conversa entre designer e cliente. */}
        <SeloLicencaCompacto licenca={licenca} contexto="publico" />

        {/*
          Quem chega pelo link e não tem sessão via "Entre na sua conta para
          comentar" — uma FRASE, sem link, com o botão de comentar desabilitado
          ao lado. Beco sem saída: a tela pedia uma coisa e não dizia por onde.

          Agora é porta, e volta para esta mesma arte depois do login. Sem o
          `next`, entrar jogava a pessoa no dashboard e ela perdia o link que
          tinha recebido — que é o único endereço que ela tem.
        */}
        {podeGerenciar && (
          <Link href={`/artes?arte=${encodeURIComponent(arte.id)}`} className="text-xs font-medium underline underline-offset-2">
            Nova versão e aprovação
          </Link>
        )}
        {situacao ? (
          <p className="ml-auto truncate text-xs text-muted-foreground">{situacao}</p>
        ) : (
          <Link
            href={urlDeLogin}
            className="ml-auto shrink-0 text-xs font-medium underline underline-offset-2"
          >
            {readOnly ? "Entrar na sua conta" : "Entrar para comentar"}
          </Link>
        )}
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
          /* Sem sessão a área de escrita não existe — ver o comentário na
             prop. A porta leva de volta para esta mesma arte. */
          temSessao={temConta}
          urlDeLogin={urlDeLogin}
          urlDeCadastro={urlDeCadastro}
          /* Aprovar exige sessão e ser o cliente do projeto. Sem conta a aba
             inteira sai, em vez de existir para devolver 401. */
          aprovacoes={
            temConta ? (
              <ApprovalsPanel key={chaveDoPainel} arteId={arte.id} />
            ) : null
          }
          /* Só quando é a vez de quem está olhando — caso contrário a barra
             não existe e a arte fica com a altura inteira. */
          /*
             Sem `!readOnly`: aprovar não passa pelo link. A permissão do link
             governa comentário (`createFeedbackViaLink` recusa com 403); a
             decisão vai por `PUT /aprovacoes/:id` com a sessão, e o backend só
             exige ser o aprovador. Condicionar a barra ao link escondia o
             botão justamente no link padrão do produto, que é só-leitura.
          */
          decisao={
            pendencia ? (
              <BarraDecisao
                versaoNumero={pendencia.versaoNumero}
                decidindo={decidindo}
                aoDecidir={decidirEAtualizarPainel}
              />
            ) : null
          }
        />
      </div>
    </main>
  );
}
