"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { updateArteMetadata, type ArteDetail } from "@/lib/artes";

export function EditArteDialog({
  open,
  onOpenChange,
  detail,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: ArteDetail | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [projetoId, setProjetoId] = useState("");

  useEffect(() => {
    if (!open || !detail) return;
    setNome(detail.nome ?? "");
    setDescricao(detail.descricao ?? "");
    setTipo(detail.tipo ?? "");
    setStatus(detail.status ?? "");
    setProjetoId(detail.projeto_id ?? detail.projeto?.id ?? "");
  }, [open, detail]);

  async function handleSave() {
    if (!detail) return;
    try {
      setSaving(true);
      await updateArteMetadata(detail.id, {
        nome,
        descricao,
        tipo,
        status: status as any,
        projetoId: projetoId || null,
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar metadados</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Nome</span>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Descrição</span>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <Input value={tipo} onChange={(e) => setTipo(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                  <SelectItem value="APROVADO">Aprovado</SelectItem>
                  <SelectItem value="REJEITADO">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Projeto ID</span>
            <Input value={projetoId} onChange={(e) => setProjetoId(e.target.value)} />
          </label>

          <div className="text-xs text-muted-foreground">
            Arquivo/tamanho inalterados. Para trocar arquivo, use <strong>Nova versão</strong>.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
