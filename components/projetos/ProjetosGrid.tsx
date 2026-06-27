// components/projetos/ProjetosGrid.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ProjetoModal from "./ProjetoModal";
import { toast } from "sonner";
import type { ProjetoInput } from "@/lib/projects";

export default function ProjetosGrid({ initial }: { initial: any[] }) {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState(initial);
  const [open, setOpen] = useState(false);

  async function handleCreate(values: ProjetoInput) {
    try {
      if (!user?.id) throw new Error("Usuário não autenticado.");

      const orcamentoCentavos = Math.round((values.orcamento ?? 0) * 100);

      const data = await api.post('/projetos', {
        nome: values.nome,
        descricao: values.descricao ?? null,
        status: values.status,
        prazo: values.prazo ?? null,
        orcamento: orcamentoCentavos,
        clienteId: values.cliente_id,
      });

      setProjetos((prev: any[]) => [data, ...prev]);
      toast.success("Projeto criado com sucesso!");
      setOpen(false);
    } catch (e: any) {
      toast.error(`Erro ao criar projeto: ${e?.message ?? "desconhecido"}`);
      throw e;
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projetos.map((p: any) => (
          <div key={p.id} className="rounded-2xl border p-4">
            <div className="font-medium">{p.nome}</div>
            <div className="text-sm text-muted-foreground">{p.status}</div>
          </div>
        ))}
      </div>

      <button className="mt-4 rounded-xl border px-3 py-2" onClick={() => setOpen(true)}>
        Novo Projeto
      </button>

      <ProjetoModal open={open} onOpenChange={setOpen} initial={null} onSubmit={handleCreate} />
    </>
  );
}
