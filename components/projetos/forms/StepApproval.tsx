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
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label>Exigir aprovação do designer</Label>
          <p className="text-xs text-muted-foreground">O Owner precisa dar o “ok” final.</p>
        </div>
        <Switch
          checked={values.aprovacao.exigirAprovacaoDesigner}
          onCheckedChange={(v) => setValues({ ...values, aprovacao: { ...values.aprovacao, exigirAprovacaoDesigner: v } })}
        />
      </div>

      <div className="space-y-2">
        <Label>Clientes aprovadores</Label>
        <AsyncUserMultiSelect
          tipo="CLIENTE"
          value={values.aprovacao.aprovadoresClienteIds}
          onChange={(arr) => setValues({ ...values, aprovacao: { ...values.aprovacao, aprovadoresClienteIds: arr } })}
          placeholder="Buscar aprovador ou adicionar por e-mail…"
          route="/api/contacts/search"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="space-y-0.5">
            <Label>Todos precisam aprovar</Label>
            <p className="text-xs text-muted-foreground">Se desativar, basta 1 aprovação de cliente.</p>
          </div>
          <Switch
            checked={values.aprovacao.todosAprovadoresSaoObrigatorios}
            onCheckedChange={(v) => setValues({ ...values, aprovacao: { ...values.aprovacao, todosAprovadoresSaoObrigatorios: v } })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label>Permitir override do Owner</Label>
          <p className="text-xs text-muted-foreground">Destrava caso cliente(s) não respondam.</p>
        </div>
        <Switch
          checked={values.aprovacao.permitirOverrideOwner}
          onCheckedChange={(v) => setValues({ ...values, aprovacao: { ...values.aprovacao, permitirOverrideOwner: v } })}
        />
      </div>

      <div className="space-y-2">
        <Label>Prazo para aprovação (dias)</Label>
        <Input
          type="number" min={0} placeholder="opcional"
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
