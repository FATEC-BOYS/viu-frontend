"use client";
import { useEffect, useState } from "react";
import { getArteDetail, type ArteDetail } from "@/lib/artes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

export function ArteQuickLookSheet({
  open,
  onOpenChange,
  arteId,
  defaultTab = "resumo",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  arteId: string | null;
  defaultTab?: "resumo" | "feedbacks" | "tarefas" | "aprovacoes";
}) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ArteDetail | null>(null);

  useEffect(() => {
    if (!open || !arteId) return;
    setLoading(true);
    getArteDetail(arteId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [open, arteId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[560px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{detail?.nome ?? "Carregando..."}</SheetTitle>
          {detail && <span className="text-sm text-muted-foreground">{detail.projeto.nome} • {detail.projeto.cliente.nome}</span>}
        </SheetHeader>

        {loading ? (
          <div className="h-[80vh] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : detail ? (
          <Tabs defaultValue={defaultTab} className="h-[calc(100vh-64px)] flex flex-col">
            <div className="p-4 border-b">
              <TabsList>
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
                <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
                <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <TabsContent value="resumo" className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{detail.tipo}</Badge>
                    <Badge>{detail.status}</Badge>
                    <Badge variant="secondary">v{detail.versao}</Badge>
                  </div>
                  {detail.descricao && <p className="text-sm text-muted-foreground">{detail.descricao}</p>}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Autor</div>
                      <div className="font-medium">{detail.autor.nome}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Projeto</div>
                      <div className="font-medium">{detail.projeto.nome}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cliente</div>
                      <div className="font-medium">{detail.projeto.cliente.nome}</div>
                    </div>
                  </div>
                  {/* preview simples */}
                  <div className="aspect-video border rounded-md grid place-items-center text-sm text-muted-foreground">
                    Preview / thumbnail
                  </div>
                </TabsContent>

                <TabsContent value="feedbacks" className="space-y-3">
                  {detail.feedbacks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem feedbacks.</p>
                  ) : (
                    detail.feedbacks.map(f => (
                      <div key={f.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{f.autor.nome}</div>
                          <div className="text-xs text-muted-foreground">{new Date(f.criado_em).toLocaleString("pt-BR")}</div>
                        </div>
                        <p className="text-sm mt-1">{f.conteudo}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="tarefas" className="space-y-3">
                  {detail.tarefas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem tarefas vinculadas.</p>
                  ) : (
                    detail.tarefas.map(t => (
                      <div key={t.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{t.titulo}</div>
                          <Badge variant="outline">{t.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Resp.: {t.responsavel.nome}
                          {t.prazo && ` • Prazo: ${new Date(t.prazo).toLocaleDateString("pt-BR")}`}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="aprovacoes" className="space-y-3">
                  {detail.aprovacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem aprovações registradas.</p>
                  ) : (
                    detail.aprovacoes.map(ap => (
                      <div key={ap.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{ap.aprovador.nome}</div>
                          <Badge>{ap.status}</Badge>
                        </div>
                        {ap.comentario && <p className="text-sm mt-1">{ap.comentario}</p>}
                        <div className="text-xs text-muted-foreground">{new Date(ap.criado_em).toLocaleString("pt-BR")}</div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="p-4 text-sm text-destructive">Não foi possível carregar os detalhes.</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
