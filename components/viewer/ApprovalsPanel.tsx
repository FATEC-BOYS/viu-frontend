// components/viewer/ApprovalsPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback /* AvatarImage */ } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Interno = {
  id: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  comentario: string | null;
  criado_em: string;
  aprovador: { id: string; nome: string | null; email: string | null };
};

type Convidado = {
  id: string;
  aprovado: boolean;
  atualizado_em: string | null;
  convidado: { id: string | null; nome: string | null; email: string | null };
};

type DataResp = {
  versao: number;
  internos: Interno[];
  convidados: Convidado[];
};

type PrincipalInfo = {
  id: string;
  nome: string | null;
  email: string | null;
  avatarUrl?: string | null;
};

type Props = {
  arteId: string;
  token: string;
  versao?: number;
  /** Novo: quem é o principal (opcional) */
  principal?: PrincipalInfo | null;
  /** Novo: quem pode “fechar para aprovação” (ex.: OWNER/designer) */
  canFecharParaAprovacao?: boolean;
};

export default function ApprovalsPanel({
  arteId,
  token,
  versao,
  principal = null,
  canFecharParaAprovacao = false,
}: Props) {
  const [data, setData] = useState<DataResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null); // id em ação

  async function load() {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ token });
      if (versao) qs.set("versao", String(versao));
      const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/aprovacoes?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("[ApprovalsPanel] GET not ok", res.status);
        setData(null);
        return;
      }
      const j = (await res.json()) as DataResp;
      setData(j);
    } catch (e) {
      console.error("[ApprovalsPanel] load error", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [arteId, token, versao]);

  const resumo = useMemo(() => {
    if (!data) return null;
    const total = data.internos.length;
    const aprovados = data.internos.filter((i) => i.status === "APROVADO").length;
    const rejeitados = data.internos.filter((i) => i.status === "REJEITADO").length;
    return { total, aprovados, rejeitados, pendentes: total - aprovados - rejeitados };
  }, [data]);

  async function decidir(aprovadorId: string, decisao: "APROVADO" | "REJEITADO") {
    try {
      setActing(aprovadorId);
      const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/aprovacoes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ aprovadorId, decisao }),
      });
      if (!res.ok) {
        let msg = "Erro ao aplicar decisão.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        alert(msg);
        return;
      }
      await load();
    } catch (e) {
      console.error("[ApprovalsPanel] decidir error", e);
      alert("Falha ao aplicar decisão.");
    } finally {
      setActing(null);
    }
  }

  async function cobrar(aprovacaoId: string, enviadoPara: string) {
    // “Em breve”: mantemos desabilitado no botão, mas deixo a função pronta
    try {
      setActing(aprovacaoId);
      const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/aprovacoes/lembrete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ aprovacaoId, enviadoPara }),
      });
      if (!res.ok) {
        let msg = "Erro ao enviar lembrete.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        alert(msg);
        return;
      }
    } catch (e) {
      console.error("[ApprovalsPanel] cobrar error", e);
      alert("Falha ao enviar lembrete.");
    } finally {
      setActing(null);
    }
  }

  async function fecharParaAprovacao() {
    try {
      setActing("fechar");
      const res = await fetch(`/api/arte/${encodeURIComponent(arteId)}/fechar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        let msg = "Não foi possível fechar para aprovação.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        alert(msg);
        return;
      }
      await load();
    } catch (e) {
      console.error("[ApprovalsPanel] fechar error", e);
      alert("Falha ao fechar para aprovação.");
    } finally {
      setActing(null);
    }
  }

  // helper UI
  function initials(n?: string | null, e?: string | null) {
    const base = (n || e || "AP").trim();
    const parts = base.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return base.slice(0, 2).toUpperCase();
  }

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Aprovações {data ? `(v${data.versao})` : ""}
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {resumo ? (
            <span suppressHydrationWarning>
              {resumo.aprovados}/{resumo.total} aprovados
              {resumo.rejeitados > 0 ? ` — ${resumo.rejeitados} rejeitado(s)` : ""}
            </span>
          ) : (
            <span>{loading ? "Carregando..." : "Sem dados."}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-18rem)] pr-3">
          {/* === HERO DO APROVADOR PRINCIPAL === */}
          {principal && (
            <div className="mb-5 rounded-xl border p-3 bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {/* Se tiver URL real, use AvatarImage */}
                    {/* <AvatarImage src={principal.avatarUrl ?? undefined} /> */}
                    <AvatarFallback>
                      {initials(principal.nome, principal.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">
                      {principal.nome || principal.email || "Aprovador principal"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Responsável por fechar a aprovação desta versão.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canFecharParaAprovacao && (
                    <Button
                      onClick={fecharParaAprovacao}
                      disabled={acting === "fechar"}
                      size="sm"
                    >
                      {acting === "fechar" ? "Processando..." : "Fechar para aprovação"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Internos */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">Aprovadores internos</h4>
            {data?.internos?.length ? (
              <div className="space-y-2">
                {data.internos.map((i) => (
                  <div key={i.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback>
                            {initials(i.aprovador.nome, i.aprovador.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {i.aprovador.nome || i.aprovador.email || "Usuário"}
                          </div>
                          <div
                            suppressHydrationWarning
                            className="text-[11px] text-muted-foreground"
                          >
                            {i.criado_em ? new Date(i.criado_em).toLocaleString() : ""}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          i.status === "APROVADO"
                            ? "default"
                            : i.status === "REJEITADO"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {i.status}
                      </Badge>
                    </div>

                    {i.comentario && (
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                        {i.comentario}
                      </p>
                    )}

                    <div className="mt-2 flex gap-2">
                      {/* Ações do próprio aprovador (você pode condicionar pelo usuário logado) */}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={acting === i.aprovador.id}
                        onClick={() => decidir(i.aprovador.id, "APROVADO")}
                      >
                        {acting === i.aprovador.id ? "Enviando..." : "Aprovar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={acting === i.aprovador.id}
                        onClick={() => decidir(i.aprovador.id, "REJEITADO")}
                      >
                        {acting === i.aprovador.id ? "Enviando..." : "Rejeitar"}
                      </Button>

                      {/* “Cobrar” — Em breve (desabilitado, com tooltip) */}
                      {i.status === "PENDENTE" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                onClick={() => cobrar(i.id, i.aprovador.id)}
                              >
                                Cobrar aprovação
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Em breve</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum aprovador interno.</p>
            )}
          </div>

          {/* Convidados (via link) */}
          <div className="mb-5">
            <h4 className="text-sm font-medium mb-2">Aprovações via link</h4>
            {data?.convidados?.length ? (
              <div className="space-y-2">
                {data.convidados.map((g) => (
                  <div key={g.id} className="rounded-md border p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback>
                            {initials(g.convidado.nome, g.convidado.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            {g.convidado.nome || g.convidado.email || "Convidado"}
                          </div>
                          <div
                            suppressHydrationWarning
                            className="text-[11px] text-muted-foreground"
                          >
                            {g.atualizado_em ? new Date(g.atualizado_em).toLocaleString() : ""}
                          </div>
                        </div>
                      </div>
                      <Badge variant={g.aprovado ? "default" : "secondary"}>
                        {g.aprovado ? "Aprovado" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum convidado aprovou ainda.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
