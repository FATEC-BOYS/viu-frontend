"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getArteDetail,
  type ArteDetail,
  deleteArteById,
} from "@/lib/artes";
import { getArtePreviewUrls, getArteDownloadUrl } from "@/lib/storage";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Trash2, PlusCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import NovaVersaoDialog from "./NovaVersaoDialog";
import VersoesList from "./VersoesList";

type TabKey = "resumo" | "feedbacks" | "tarefas" | "aprovacoes" | "versoes";

export function ArteQuickLookSheet({
  open,
  onOpenChange,
  arteId,
  defaultTab = "resumo",
  onCreateTask,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  arteId: string | null;
  defaultTab?: TabKey;
  onCreateTask?: (arteId: string) => void;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ArteDetail | null>(null);

  // preview & download
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // excluir
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // nova versão
  const [novaVersaoOpen, setNovaVersaoOpen] = useState(false);

  useEffect(() => {
    if (!open || !arteId) return;
    setDetail(null);
    setPreviewUrl(null);
    setDownloadUrl(null);
    setLoading(true);

    (async () => {
      try {
        const data = await getArteDetail(arteId);
        setDetail(data ?? null);

        if (data?.arquivo) {
          const { previewUrl } = await getArtePreviewUrls(data.arquivo);
          setPreviewUrl(previewUrl ?? null);

          const dl = await getArteDownloadUrl(data.arquivo);
          setDownloadUrl(dl ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, arteId]);

  const tabsKey = useMemo(
    () => `${arteId ?? "none"}:${defaultTab}`,
    [arteId, defaultTab]
  );

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  const statusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">—</Badge>;
    const map: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      EM_ANALISE: { variant: "outline", label: "Em Análise" },
      APROVADO: { variant: "default", label: "Aprovado" },
      REJEITADO: { variant: "destructive", label: "Rejeitado" },
      PENDENTE: { variant: "secondary", label: "Pendente" },
      RASCUNHO: { variant: "secondary", label: "Rascunho" },
    };
    const conf = map[status] ?? { variant: "outline", label: status };
    return <Badge variant={conf.variant}>{conf.label}</Badge>;
  };

  async function reallyDelete() {
    if (!detail?.id) return;
    try {
      setDeleting(true);
      await deleteArteById(detail.id, { storageMode: "all" });
      toast.success("Arte excluída.");
      onOpenChange(false);
      router.refresh?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir a arte.");
    } finally {
      setDeleting(false);
    }
  }

  // Renderiza o preview conforme o tipo
  function PreviewBlock() {
    const tipo = detail?.tipo ?? "";
    const isImg = tipo.startsWith("image/");
    const isVideo = tipo.startsWith("video/");
    const isAudio = tipo.startsWith("audio/");
    const isPdf = tipo === "application/pdf";

    if (isImg && previewUrl) {
      return (
        <div className="aspect-video border rounded-md overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={detail?.nome ?? "preview"}
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    if (isVideo && previewUrl) {
      return (
        <div className="aspect-video border rounded-md overflow-hidden bg-black">
          <video src={previewUrl} controls className="w-full h-full" />
        </div>
      );
    }

    if (isAudio && previewUrl) {
      return (
        <div className="border rounded-md p-4 flex items-center justify-between">
          <div className="text-sm">
            {detail?.nome ?? "Áudio"}
            <div className="text-xs text-muted-foreground">{detail?.tipo}</div>
          </div>
          <audio src={previewUrl} controls className="w-2/3" />
        </div>
      );
    }

    if (isPdf && previewUrl) {
      return (
        <div className="aspect-video border rounded-md overflow-hidden bg-muted">
          <iframe src={previewUrl} className="w-full h-full" />
        </div>
      );
    }

    return (
      <div className="aspect-video border rounded-md grid place-items-center text-sm text-muted-foreground">
        {downloadUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(downloadUrl!, "_blank")}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar arquivo
          </Button>
        ) : (
          "Sem preview disponível"
        )}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[560px] p-0">
        <SheetHeader className="p-4 border-b flex justify-between items-center">
          <div>
            <SheetTitle>{detail?.nome ?? (loading ? "Carregando..." : "—")}</SheetTitle>
            {detail ? (
              <span className="text-sm text-muted-foreground">
                {detail?.projeto?.nome ?? "Projeto —"} •{" "}
                {detail?.projeto?.cliente?.nome ?? "Cliente —"}
              </span>
            ) : null}
          </div>
          {detail && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNovaVersaoOpen(true)}
              >
                <PlusCircle className="h-4 w-4 mr-1" /> Nova versão
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </div>
          )}
        </SheetHeader>

        {loading ? (
          <div className="h-[80vh] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <Tabs
            key={tabsKey}
            defaultValue={defaultTab}
            className="h-[calc(100vh-64px)] flex flex-col"
          >
            <div className="p-4 border-b">
              <TabsList>
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
                <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
                <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
                <TabsTrigger value="versoes">Versões</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <TabsContent value="resumo" className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{detail?.tipo ?? "—"}</Badge>
                    {statusBadge(detail?.status)}
                    <Badge variant="secondary">v{detail?.versao ?? 1}</Badge>
                  </div>

                  {detail?.descricao ? (
                    <p className="text-sm text-muted-foreground">{detail.descricao}</p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Autor</div>
                      <div className="font-medium">{detail?.autor?.nome ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Projeto</div>
                      <div className="font-medium">{detail?.projeto?.nome ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cliente</div>
                      <div className="font-medium">{detail?.projeto?.cliente?.nome ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Criado em</div>
                      <div className="font-medium">{fmtDate(detail?.criado_em)}</div>
                    </div>
                  </div>

                  <PreviewBlock />
                </TabsContent>

                <TabsContent value="versoes">
                  <VersoesList arteId={detail.id} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="p-4 text-sm text-destructive">
            Não foi possível carregar os detalhes.
          </div>
        )}
      </SheetContent>

      {/* Confirm delete */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arte?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Vai excluir a arte, feedbacks,
              aprovações e versões relacionadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={reallyDelete} disabled={deleting}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nova versão */}
      {detail && (
        <NovaVersaoDialog
          open={novaVersaoOpen}
          onOpenChange={setNovaVersaoOpen}
          arte={detail}
          onCreated={() => {
            toast.success("Nova versão criada");
            router.refresh();
          }}
        />
      )}
    </Sheet>
  );
}
