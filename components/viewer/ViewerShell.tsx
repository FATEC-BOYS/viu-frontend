// components/viewer/ViewerShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import IdentityGate from "@/components/viewer/IdentityGate";
import FeedbackViewer from "@/components/viewer/FeedbackViewer";
import FeedbackPanel from "@/components/viewer/FeedbackPanel";
import ApprovalsPanel from "@/components/viewer/ApprovalsPanel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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

type PrincipalInfo = {
  id: string;
  nome: string | null;
  email: string | null;
  avatarUrl?: string | null;
};

// Se você já tiver esse dado vindo do server, passe por props.
// Aqui mantive opcional — se vier null não renderizamos avatar grande.
type Props = {
  arte: Arte;
  initialFeedbacks: any[];
  versoes: { id: string | null; numero: number; criado_em: string; status: string | null }[];
  aprovacoesByVersao: Record<string, any[]>;
  readOnly: boolean;
  token: string;

  // opcional: quem é o aprovador principal para exibir no header
  principal?: PrincipalInfo | null;

  // opcional: flags de permissão resolvidas no server
  canFecharParaAprovacao?: boolean; // típico para OWNER/aprovador principal
};

export default function ViewerShell({
  arte,
  initialFeedbacks,
  versoes,
  aprovacoesByVersao,
  readOnly,
  token,
  principal = null,
  canFecharParaAprovacao = false,
}: Props) {
  const [viewer, setViewer] = useState<{ email: string; nome?: string | null } | null>(null);
  const [showIdentity, setShowIdentity] = useState(true);
  const [activeTab, setActiveTab] = useState<"aprovacoes" | "feedbacks">("aprovacoes");
  const statusLabel = useMemo(() => arte.status || "EM_ANALISE", [arte.status]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("viu.viewer");
      if (raw) {
        const v = JSON.parse(raw);
        if (v?.email) {
          setViewer({ email: v.email, nome: v.nome ?? null });
          setShowIdentity(false);
        }
      }
    } catch {}
  }, []);

  async function handleFecharParaAprovacao() {
    try {
      const res = await fetch(`/api/arte/${arte.id}/fechar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({}), // no-op; server resolve tudo
      });
      if (!res.ok) {
        let msg = "Não foi possível fechar para aprovação.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        toast.error(msg);
        return;
      }
      // Opcional: trocar aba automaticamente para Aprovações
      setActiveTab("aprovacoes");
    } catch (e) {
      console.error("[ViewerShell] erro fechar para aprovação:", e);
      toast.error("Falha ao fechar para aprovação.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="rounded-2xl overflow-hidden border mb-4">
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 h-20" />
        <div className="p-4 bg-background">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {principal && (
                <Avatar className="h-12 w-12">
                  {/* se tiver avatar real, coloque <AvatarImage src={principal.avatarUrl ?? undefined} /> */}
                  <AvatarFallback>
                    {principal.nome?.slice(0, 2).toUpperCase() ||
                      principal.email?.slice(0, 2).toUpperCase() ||
                      "AP"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                  {arte.nome}
                  <span className="text-muted-foreground">— v{arte.versao}</span>
                  <Badge variant="secondary">{statusLabel}</Badge>
                </h1>
                <p className="text-xs text-muted-foreground">
                  {readOnly
                    ? "Modo leitura"
                    : viewer?.email
                    ? `Comentando como ${viewer.email}`
                    : "Identifique-se para comentar ou aprovar."}
                </p>
                {principal && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Aprovador principal:{" "}
                    <span className="font-medium">
                      {principal.nome || principal.email || "Não definido"}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Ação “Fechar para aprovação” — só para quem pode */}
            {canFecharParaAprovacao && (
              <div className="shrink-0 flex items-center gap-2">
                <Button onClick={handleFecharParaAprovacao}>Fechar para aprovação</Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        <section className="rounded-2xl border overflow-hidden">
          <FeedbackViewer
            arte={arte}
            initialFeedbacks={initialFeedbacks}
            viewer={viewer}
            readOnly={readOnly}
            token={token}
            onAskIdentity={() => setShowIdentity(true)}
          />
        </section>

        <aside className="rounded-2xl border overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <div className="flex items-center justify-between p-3 border-b bg-background">
              <TabsList>
                <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
                <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="aprovacoes" className="m-0">
              <ApprovalsPanel arteId={arte.id} token={token} />
            </TabsContent>

            <TabsContent value="feedbacks" className="m-0">
              <FeedbackPanel
                arteId={arte.id}
                versoes={versoes}
                aprovacoesByVersao={aprovacoesByVersao}
                readOnly={readOnly}
                viewer={viewer}
                token={token}
                initialFeedbacks={initialFeedbacks}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {showIdentity && (
        <IdentityGate
          token={token}
          arteId={arte.id}
          onIdentified={(v) => {
            setViewer(v);
            setShowIdentity(false);
          }}
        />
      )}
    </main>
  );
}
