"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjetoFormValues, StatusProjeto } from "../ProjetoForm";
import AsyncUserSingleSelect from "../AsyncUserSingleSelect";

export default function StepBasic({
  values, setValues, souCliente,
}: {
  values: ProjetoFormValues;
  setValues: (v: ProjetoFormValues) => void;
  souCliente: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Projeto</Label>
        <Input id="nome" value={values.nome} onChange={(e) => setValues({ ...values, nome: e.target.value })} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" rows={3} value={values.descricao || ""} onChange={(e) => setValues({ ...values, descricao: e.target.value })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={values.status} onValueChange={(v) => setValues({ ...values, status: v as StatusProjeto })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
              <SelectItem value="CONCLUIDO">Concluído</SelectItem>
              <SelectItem value="PAUSADO">Pausado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01"
            value={Number.isFinite(values.orcamento) ? values.orcamento : 0}
            onChange={(e) => setValues({ ...values, orcamento: parseFloat(e.target.value) || 0 })}
            required inputMode="decimal" />
        </div>

        <div className="space-y-2">
          <Label>Data de Entrega</Label>
          <Input type="date" value={values.prazo || ""} onChange={(e) => setValues({ ...values, prazo: e.target.value })} />
        </div>

        {!souCliente && (
          <div className="space-y-2">
            <Label>Cliente principal</Label>
            <AsyncUserSingleSelect
              tipo="CLIENTE"
              value={values.cliente_id}
              onChange={(id) => setValues({ ...values, cliente_id: id })}
              placeholder="Buscar ou adicionar por e-mail…"
              route="/api/contacts/search"
            />
          </div>
        )}
      </div>
    </div>
  );
}
