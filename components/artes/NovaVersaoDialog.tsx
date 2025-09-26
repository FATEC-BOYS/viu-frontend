"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createNovaVersao, type ArteDetail } from "@/lib/artes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  arte: ArteDetail;
  onCreated?: () => void; // refetch caller
};

export default function NovaVersaoDialog({
  open,
  onOpenChange,
  arte,
  onCreated,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const nomeSugerido = useMemo(() => {
    if (!arte?.nome) return "";
    // ex: "Peça Final v2" → "Peça Final v<next>"
    const m = arte.nome.match(/v(\d+)\s*$/i);
    if (m) {
      const n = Number(m[1] || "0") + 1;
      return arte.nome.replace(/v(\d+)\s*$/i, `v${n}`);
    }
    // ex: "Peça Final" → "Peça Final v<next>"
    return `${arte.nome} v${(arte?.versao ?? 1) + 1}`;
  }, [arte?.nome, arte?.versao]);

  function resetState() {
    setFile(null);
    setNovoNome("");
    setSubmitting(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Selecione um arquivo.");
      return;
    }
    try {
      setSubmitting(true);
      setProgress(10); // fake progress (Supabase client não dá callback de progresso)
      const mime = file.type || undefined;

      await createNovaVersao({
        arteId: arte.id,
        file,
        mime,
        novoNomeOpcional: novoNome?.trim() ? novoNome.trim() : undefined,
      });

      setProgress(100);
      toast.success("Nova versão criada com sucesso.");
      onOpenChange(false);
      resetState();
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar nova versão.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetState();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova versão</DialogTitle>
          <DialogDescription>
            Faça upload do novo arquivo. A versão será incrementada e o histórico ficará
            disponível em “Versões”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Arquivo</Label>
            <Input
              ref={inputRef}
              type="file"
              accept="*/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Arquivo atual: <span className="font-mono">v{arte.versao}</span>
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Novo nome (opcional)</Label>
            <Input
              placeholder={nomeSugerido}
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Se vazio, mantém o nome atual ({arte.nome}).
            </p>
          </div>

          {submitting && (
            <div className="grid gap-2">
              <Label>Enviando</Label>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Criar nova versão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
