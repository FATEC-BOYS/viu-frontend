"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatarDia } from "@/lib/diaDeCalendario";
import { rotuloProjeto } from "@/lib/rotulos";
import { decidirAprovacao } from "@/lib/aprovacoesDaArte";
import {
  listarDecisoesDoProjeto,
  esperandoVoce,
  jaDecididas,
  type DecisaoDoCliente,
} from "@/lib/aprovacoesDoCliente";

/**
 * O projeto pelo olho de quem contratou.
 *
 * Não é a tela do designer com menos botões — é outra pergunta. O designer
 * abre o projeto para saber "o que eu faço agora"; o cliente abre para saber
 * "o que esperam de mim, e como eu respondo". A tela antiga respondia só a
 * primeira, para os dois, e o resultado medido foi este, logado como cliente
 * num projeto com uma arte aguardando a decisão dele:
 *
 *   "Próximos passos: Enviar para aprovação"    ← passo do designer
 *   "Tarefas: Ajustar cor do logo · Ana Silva"  ← o quadro interno do ateliê
 *   "esperando João Santos desde 14/10"         ← ele, em terceira pessoa
 *   [Enviar lembrete]                           ← para lembrar a si mesmo
 *
 * E nenhum "Aprovar" em lugar nenhum: o cliente logado na própria conta não
 * conseguia decidir — só pelo link compartilhado. O produto existe para fechar
 * esse laço, e a tela dele era o único lugar onde ele não fechava.
 *
 * A ordem aqui responde a pergunta dele: primeiro o que espera por ele, depois
 * o que ele já respondeu, por último como vai a entrega. Tarefas e Linha do
 * tempo não aparecem — são o processo de dentro do ateliê, e mostrá-las só
 * convida a cobrança sobre coisa que não é dele.
 */

type ProjetoMin = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: string;
  prazo?: string | null;
  designer?: { id: string; nome: string | null } | null;
};

export default function ProjetoDoCliente({
  projeto,
  usuarioId,
}: {
  projeto: ProjetoMin;
  usuarioId: string;
}) {
  const [decisoes, setDecisoes] = useState<DecisaoDoCliente[] | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(false);
      setDecisoes(await listarDecisoesDoProjeto(projeto.id, usuarioId));
    } catch {
      setErro(true);
    }
  }, [projeto.id, usuarioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pendentes = decisoes ? esperandoVoce(decisoes) : [];
  const decididas = decisoes ? jaDecididas(decisoes) : [];

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-1 text-xs text-muted-foreground">
          <Link href="/projetos" className="hover:underline">
            Projetos
          </Link>
          <span className="mx-1">/</span>
          <span>Projeto</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight sm:text-3xl">
            {projeto.nome}
          </h1>
          <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs">
            {rotuloProjeto(projeto.status)}
          </Badge>
        </div>
        {projeto.designer?.nome && (
          <p className="mt-1 text-sm text-muted-foreground">
            Trabalho de {projeto.designer.nome}
          </p>
        )}
        <Button variant="ghost" size="sm" asChild className="mt-2 -ml-2">
          <Link href="/projetos" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
      </header>

      {decisoes === null && !erro && (
        <p className="py-6 text-sm text-muted-foreground">Carregando…</p>
      )}

      {erro && (
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-medium">Não foi possível carregar suas aprovações.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={carregar}>
            Tentar de novo
          </Button>
        </div>
      )}

      {decisoes !== null && !erro && (
        <>
          <section>
            <h2 className="pb-2 text-sm font-semibold">Esperando você</h2>
            {pendentes.length === 0 ? (
              /*
                A frase diz o que é verdade e o que NÃO é. "Nada esperando por
                você" sozinho faz a pessoa achar que o projeto parou; a segunda
                linha devolve a bola a quem está com ela.
              */
              <p className="py-3 text-sm text-muted-foreground">
                Nada esperando por você agora. Quando houver uma arte para
                aprovar, ela aparece aqui.
              </p>
            ) : (
              <ul className="space-y-3">
                {pendentes.map((d) => (
                  <CartaoDeDecisao key={d.id} decisao={d} aoDecidir={carregar} />
                ))}
              </ul>
            )}
          </section>

          {decididas.length > 0 && (
            <section>
              <h2 className="pb-2 text-sm font-semibold">Você já respondeu</h2>
              <ul className="divide-y rounded-xl border bg-card">
                {decididas.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 p-3">
                    <Miniatura src={d.arte.previewUrl} nome={d.arte.nome} pequena />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.arte.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.status === "APROVADO" ? "Aprovada" : "Ajustes pedidos"}
                        {d.versaoNumero != null && ` · v${d.versaoNumero}`}
                        {d.decididoEm && ` · ${formatarDia(d.decididoEm)}`}
                      </p>
                      {d.comentario && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          “{d.comentario}”
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 rounded-full text-xs ${
                        d.status === "APROVADO"
                          ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                          : "border-amber-500/30 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {d.status === "APROVADO" ? "Aprovada" : "Com ajustes"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {projeto.prazo && (
            <section className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Entrega combinada</p>
              <p className="text-sm font-medium">{formatarDia(projeto.prazo)}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** A miniatura da arte, ou um lugar vazio honesto quando ela não carrega. */
function Miniatura({
  src,
  nome,
  pequena = false,
}: {
  src: string | null;
  nome: string;
  pequena?: boolean;
}) {
  const tamanho = pequena ? "h-12 w-12" : "h-20 w-20";
  if (!src) {
    return (
      <div
        className={`${tamanho} shrink-0 rounded-md border bg-muted`}
        aria-label={`${nome} — sem prévia`}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={nome}
      className={`${tamanho} shrink-0 rounded-md border object-cover`}
    />
  );
}

/**
 * Uma arte esperando a decisão — com a decisão ali, e não em outra tela.
 *
 * "Abrir e comentar" leva ao visualizador, que é onde se marca o ponto exato
 * da arte. Aqui ficam as duas respostas que não precisam de pino: aprovar, e
 * pedir ajuste com o motivo escrito.
 */
function CartaoDeDecisao({
  decisao,
  aoDecidir,
}: {
  decisao: DecisaoDoCliente;
  aoDecidir: () => Promise<void> | void;
}) {
  const [pedindoAjuste, setPedindoAjuste] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function decidir(status: "APROVADO" | "REJEITADO", comentario?: string) {
    setEnviando(true);
    try {
      await decidirAprovacao(decisao.id, status, comentario ?? null);
      toast.success(status === "APROVADO" ? "Arte aprovada" : "Pedido de ajuste enviado");
      setPedindoAjuste(false);
      setMotivo("");
      await aoDecidir();
    } catch {
      toast.error("Não foi possível registrar sua decisão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <Miniatura src={decisao.arte.previewUrl} nome={decisao.arte.nome} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{decisao.arte.nome}</p>
          <p className="text-xs text-muted-foreground">
            {decisao.versaoNumero != null
              ? `Versão ${decisao.versaoNumero}`
              : `Versão ${decisao.arte.versao}`}
            {decisao.criadoEm && ` · enviada em ${formatarDia(decisao.criadoEm)}`}
          </p>
          <Button variant="link" size="sm" asChild className="mt-1 h-auto p-0 text-xs">
            <Link href={`/viewer/arte/${decisao.arte.id}`}>
              Abrir e comentar na arte
            </Link>
          </Button>
        </div>
      </div>

      {!pedindoAjuste ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={enviando}
            onClick={() => decidir("APROVADO")}
          >
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={enviando}
            onClick={() => setPedindoAjuste(true)}
          >
            <MessageSquare className="h-4 w-4" />
            Pedir ajustes
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {/*
            O motivo é obrigatório: "pedir ajustes" sem dizer quais devolve a
            arte sem devolver a informação, e o designer fica com a rodada
            gasta e nada para fazer.
          */}
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="O que precisa mudar?"
            rows={3}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={enviando || !motivo.trim()}
              onClick={() => decidir("REJEITADO", motivo.trim())}
            >
              {enviando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Enviar pedido de ajuste
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={enviando}
              onClick={() => {
                setPedindoAjuste(false);
                setMotivo("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
