// components/projetos/forms/StepApproval.tsx
"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProjetoFormValues } from "../ProjetoForm";
import AsyncUserMultiSelect from "../AsyncUserMultiSelect";

export default function StepApproval({
  values, setValues,
}: {
  values: ProjetoFormValues;
  setValues: (v: ProjetoFormValues) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 p-4 sm:p-5">
        <div className="space-y-0.5">
          <Label htmlFor="approval-designer">Exigir aprovação do designer</Label>
          <p className="text-xs text-muted-foreground">O designer responsável também precisa aprovar.</p>
        </div>
        <Switch id="approval-designer" className="shrink-0"
          checked={values.aprovacao.exigirAprovacaoDesigner}
          onCheckedChange={(v) => setValues({ ...values, aprovacao: { ...values.aprovacao, exigirAprovacaoDesigner: v } })}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <Label>Clientes aprovadores</Label>
        <AsyncUserMultiSelect
          tipo="CLIENTE"
          value={values.aprovacao.aprovadoresClienteIds}
          onChange={(arr) => setValues({ ...values, aprovacao: { ...values.aprovacao, aprovadoresClienteIds: arr } })}
          placeholder="Buscar aprovador ou adicionar por e-mail…"
        />
        <div className="flex items-start justify-between gap-4 border-t border-border/60 pt-4">
          <div className="space-y-0.5">
            <Label htmlFor="approval-all">Todos precisam aprovar</Label>
            <p className="text-xs text-muted-foreground">Se desativar, basta a aprovação de um dos clientes selecionados.</p>
          </div>
          <Switch id="approval-all" className="shrink-0"
            checked={values.aprovacao.todosAprovadoresSaoObrigatorios}
            onCheckedChange={(v) => setValues({ ...values, aprovacao: { ...values.aprovacao, todosAprovadoresSaoObrigatorios: v } })}
          />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 p-4 sm:p-5">
        <div className="space-y-0.5">
          <Label htmlFor="approval-owner">Permitir decisão do responsável</Label>
          <p className="text-xs text-muted-foreground">O responsável pode concluir a aprovação mesmo sem a resposta de todos os clientes.</p>
        </div>
        <Switch id="approval-owner" className="shrink-0"
          checked={values.aprovacao.permitirOverrideOwner}
          onCheckedChange={(v) => setValues({ ...values, aprovacao: { ...values.aprovacao, permitirOverrideOwner: v } })}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <Label htmlFor="approval-days">Prazo para aprovação (dias)</Label>
        <Input
          id="approval-days" type="number" min={0} placeholder="opcional"
          value={values.aprovacao.prazoAprovacaoDias ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            const n = raw === "" ? null : Math.max(0, parseInt(raw || "0"));
            setValues({ ...values, aprovacao: { ...values.aprovacao, prazoAprovacaoDias: (raw === "" ? null : n) } });
          }}
        />
      </div>
    </div>
  );
}
