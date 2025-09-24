"use client";

import { useEffect, useState } from "react";
import { listVersoes, type VersaoGroup } from "@/lib/artes";
import { getArteDownloadUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, File, Files, Image as ImageIcon } from "lucide-react";

export default function VersoesList({ arteId }: { arteId: string }) {
  const [versoes, setVersoes] = useState<VersaoGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!arteId) return;
    setLoading(true);
    listVersoes(arteId)
      .then((v) => setVersoes(v ?? []))
      .finally(() => setLoading(false));
  }, [arteId]);

  async function handleDownload(path: string) {
    const url = await getArteDownloadUrl(path);
    if (url) window.open(url, "_blank");
  }

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString("pt-BR") : "—";

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando versões…</div>;
  }

  if (!versoes.length) {
    return (
      <div className="text-sm text-muted-foreground">
        Sem histórico de versões ainda. Ao criar uma nova versão, ela aparece aqui.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[60vh] pr-2">
      <div className="space-y-3">
        {versoes.map((v) => (
          <Card key={v.versao}>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Files className="h-4 w-4" />
                Versão <span className="font-mono">v{v.versao}</span>
                <Badge variant="outline">{fmtDate(v.criado_em)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {v.arquivos.map((a) => {
                const isImg = (a.mime || "").startsWith("image/");
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border rounded-md p-2"
                  >
                    <div className="flex items-center gap-2">
                      {isImg ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <File className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="text-sm">
                        <div className="font-medium">{a.arquivo.split("/").pop()}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.kind} • {a.mime || "—"} •{" "}
                          {typeof a.tamanho === "number"
                            ? `${(a.tamanho / 1024 / 1024).toFixed(2)} MB`
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{a.kind}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(a.arquivo)}
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
