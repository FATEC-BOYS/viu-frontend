"use client";
import { Button } from "@/components/ui/button";
import { Download, Pencil, PlusCircle, Trash2 } from "lucide-react";

export function ArteActions({
  onEditar,
  onNovaVersao,
  onDownload,
  onExcluir,
  deleting = false,
  hasDownload = false,
}: {
  onEditar: () => void;
  onNovaVersao: () => void;
  onDownload?: () => void;
  onExcluir: () => void;
  deleting?: boolean;
  hasDownload?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onEditar}>
        <Pencil className="h-4 w-4 mr-2" />
        Editar
      </Button>
      <Button size="sm" variant="secondary" onClick={onNovaVersao}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Nova versão
      </Button>
      {hasDownload && onDownload ? (
        <Button size="sm" variant="outline" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Baixar
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="destructive"
        onClick={onExcluir}
        disabled={deleting}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {deleting ? "Excluindo..." : "Excluir"}
      </Button>
    </div>
  );
}
