// components/projetos/forms/StepParticipants.tsx
"use client";
import { Label } from "@/components/ui/label";
import type { ProjetoFormValues } from "../ProjetoForm";
import AsyncUserMultiSelect from "../AsyncUserMultiSelect";

export default function StepParticipants({
  values, setValues, souCliente,
}: {
  values: ProjetoFormValues;
  setValues: (v: ProjetoFormValues) => void;
  souCliente: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <Label>Designers adicionais</Label>
        <p className="text-sm text-muted-foreground">Quem vai criar junto com você?</p>
        <AsyncUserMultiSelect
          tipo="DESIGNER"
          value={values.participantes.designersAdicionaisIds}
          onChange={(arr) => setValues({ ...values, participantes: { ...values.participantes, designersAdicionaisIds: arr } })}
          placeholder="Buscar designer ou adicionar por e-mail…"
        />
      </div>

      {!souCliente && (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
          <Label>Clientes adicionais</Label>
            <p className="text-sm text-muted-foreground">Inclua outras pessoas do lado do cliente.</p>
          <AsyncUserMultiSelect
            tipo="CLIENTE"
            value={values.participantes.clientesAdicionaisIds}
            onChange={(arr) => setValues({ ...values, participantes: { ...values.participantes, clientesAdicionaisIds: arr } })}
            placeholder="Buscar cliente ou adicionar por e-mail…"
          />
        </div>
      )}
    </div>
  );
}
