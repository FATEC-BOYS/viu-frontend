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
      <div className="space-y-1">
        <Label>Designers adicionais</Label>
        <AsyncUserMultiSelect
          tipo="DESIGNER"
          value={values.participantes.designersAdicionaisIds}
          onChange={(arr) => setValues({ ...values, participantes: { ...values.participantes, designersAdicionaisIds: arr } })}
          placeholder="Buscar designer ou adicionar por e-mail…"
          route="/api/contacts/search"
        />
      </div>

      {!souCliente && (
        <div className="space-y-1">
          <Label>Clientes adicionais</Label>
          <AsyncUserMultiSelect
            tipo="CLIENTE"
            value={values.participantes.clientesAdicionaisIds}
            onChange={(arr) => setValues({ ...values, participantes: { ...values.participantes, clientesAdicionaisIds: arr } })}
            placeholder="Buscar cliente ou adicionar por e-mail…"
            route="/api/contacts/search"
          />
        </div>
      )}
    </div>
  );
}
