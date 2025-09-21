"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type StatusProjeto = "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";

export interface ClienteOption { id: string; nome: string }

export interface ProjetoFormValues {
  nome: string;
  descricao?: string;
  status: StatusProjeto;
  orcamento: number;   // em R$
  prazo?: string;      // yyyy-mm-dd (string vazia se não tiver)
  cliente_id: string;
}

export function ProjetoForm({
  values, setValues, clientes, souCliente,
}: {
  values: ProjetoFormValues;
  setValues: (v: ProjetoFormValues) => void;
  clientes: ClienteOption[];
  souCliente: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Projeto</Label>
        <Input id="nome" value={values.nome}
               onChange={(e) => setValues({ ...values, nome: e.target.value })} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" value={values.descricao || ""}
                  onChange={(e) => setValues({ ...values, descricao: e.target.value })} rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={values.status}
                onValueChange={(value) => setValues({ ...values, status: value as StatusProjeto })}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
            <SelectItem value="CONCLUIDO">Finalizado</SelectItem>
            <SelectItem value="PAUSADO">Pausado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!souCliente && (
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Select value={values.cliente_id}
                  onValueChange={(v) => setValues({ ...values, cliente_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="orcamento">Valor (R$)</Label>
        <Input id="orcamento" type="number" step="0.01"
               value={Number.isFinite(values.orcamento) ? values.orcamento : 0}
               onChange={(e) => setValues({ ...values, orcamento: parseFloat(e.target.value) || 0 })}
               required inputMode="decimal" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prazo">Data de Entrega</Label>
        <Input id="prazo" type="date" value={values.prazo || ""}
               onChange={(e) => setValues({ ...values, prazo: e.target.value })} />
      </div>
    </div>
  );
}
