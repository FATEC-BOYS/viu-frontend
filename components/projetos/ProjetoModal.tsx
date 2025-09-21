// components/projetos/ProjetoModal.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ProjetoForm, type ProjetoFormValues, type ClienteOption } from "./ProjetoForm";
import type { ProjetoInput } from "@/lib/projects";

type StatusProjeto = "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";

/** Shape mínimo aceito em `initial` (o page.tsx faz o mapeamento) */
export type ProjetoInitial = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: StatusProjeto;
  orcamento: number;          // centavos
  prazo?: string | null;      // ISO | null
  cliente_id?: string | null; // pode vir ausente
};

interface ProjetoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ProjetoInitial | null;
  onSubmit?: (values: ProjetoInput) => Promise<void>; // (R$ no orcamento, prazo string|null)
}

/* ---------- utils ---------- */
function safeErrorToString(err: unknown) {
  try {
    if (!err) return "Erro desconhecido";
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message || (err as any).name || "Erro";
    if (typeof err === "object") {
      const anyErr = err as any;
      if (anyErr.message) return anyErr.message;
      if (anyErr.code || anyErr.details || anyErr.hint) {
        return JSON.stringify({ code: anyErr.code, message: anyErr.message, details: anyErr.details, hint: anyErr.hint });
      }
      return JSON.stringify(err);
    }
    return String(err);
  } catch {
    return "Erro ao serializar o erro";
  }
}
const isUuidLike = (v?: string | null) => !!v && v.length === 36;

/** Garante que exista um perfil em public.usuarios com id = auth.uid() */
async function ensureUsuarioExiste() {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const u = auth?.user;
  if (!u) throw new Error("Não autenticado.");

  const { data: me, error: meErr } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id", u.id)
    .maybeSingle();

  if (meErr) throw meErr;
  if (me) return;

  const nome =
    (u.user_metadata?.full_name as string) ||
    (u.user_metadata?.name as string) ||
    (u.email?.split("@")[0] as string) ||
    "Usuário";

  const { error: insErr } = await supabase.from("usuarios").insert({ id: u.id, email: u.email, nome });
  if (insErr) throw insErr;
}

/* ---------- componente ---------- */
export default function ProjetoModal({ open, onOpenChange, initial, onSubmit }: ProjetoModalProps) {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [souCliente, setSouCliente] = useState(false);

  const [formData, setFormData] = useState<ProjetoFormValues>({
    nome: "",
    descricao: "",
    status: "EM_ANDAMENTO",
    orcamento: 0,   // R$ no formulário
    prazo: "",
    cliente_id: "",
  });

  // Boot: garante perfil, detecta tipo, carrega clientes
  useEffect(() => {
    const boot = async () => {
      if (!open) return;
      setLoading(true);
      try {
        await ensureUsuarioExiste();

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id ?? null;

        if (userId) {
          const { data: me } = await supabase
            .from("usuarios")
            .select("id, tipo")
            .eq("id", userId)
            .maybeSingle();

          if (me?.tipo === "CLIENTE") {
            setSouCliente(true);
            setFormData((prev: ProjetoFormValues) => ({ ...prev, cliente_id: me.id }));
          } else {
            setSouCliente(false);
          }
        }

        const { data: cliData, error: cliErr } = await supabase
          .from("usuarios")
          .select("id, nome")
          .eq("tipo", "CLIENTE")
          .eq("ativo", true)
          .order("nome", { ascending: true });

        if (cliErr) throw cliErr;

        const opts = (cliData ?? []).map((c) => ({ id: c.id as string, nome: c.nome as string }));
        setClientes(opts);

        // 🆕 auto-seleciona o 1º cliente se não for CLIENTE e ainda não tiver cliente_id
        if (!souCliente && !formData.cliente_id && opts.length > 0) {
          setFormData((prev: ProjetoFormValues) => ({ ...prev, cliente_id: opts[0].id }));
        }
      } catch (e) {
        console.error("Erro ao inicializar modal de projeto:", safeErrorToString(e), e);
      } finally {
        setLoading(false);
      }
    };

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Preenche ao editar
  useEffect(() => {
    if (initial) {
      setFormData((prev: ProjetoFormValues) => ({
        ...prev,
        nome: initial.nome,
        descricao: initial.descricao || "",
        status: initial.status,
        orcamento: (initial.orcamento ?? 0) / 100, // centavos -> R$
        prazo: initial.prazo ? initial.prazo.substring(0, 10) : "",
        // preserva o que já estava (ex.: boot para CLIENTE) caso initial não traga cliente_id
        cliente_id: initial.cliente_id ?? prev.cliente_id ?? "",
      }));
    } else {
      setFormData((prev: ProjetoFormValues) => ({
        ...prev,
        nome: "",
        descricao: "",
        status: "EM_ANDAMENTO",
        orcamento: 0,
        prazo: "",
        cliente_id: prev.cliente_id || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await ensureUsuarioExiste();

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      if (!formData.nome.trim()) throw new Error("Nome é obrigatório.");

      // 🔒 clienteId SEMPRE válido (evita uuid "")
      const clienteId = souCliente ? userId : (isUuidLike(formData.cliente_id) ? formData.cliente_id! : null);
      if (!clienteId) throw new Error("Selecione um cliente.");

      // ProjetoInput: prazo = string|null; orcamento = R$
      const prazoISO: string | null = formData.prazo ? new Date(formData.prazo).toISOString() : null;

      if (onSubmit) {
        const values: ProjetoInput = {
            nome: formData.nome.trim(),
            descricao: formData.descricao?.trim() || undefined,
            status: formData.status,
            prazo: prazoISO,
            cliente_id: clienteId,
            orcamento: Number.isFinite(formData.orcamento) ? formData.orcamento : 0,
        };
        await onSubmit(values);
      } else {
        // fallback: inserir direto (converte R$ -> centavos)
        const orcamentoCentavos = Math.round((Number.isFinite(formData.orcamento) ? formData.orcamento : 0) * 100);

        const { error } = await supabase
          .from("projetos")
          .insert({
            nome: formData.nome.trim(),
            descricao: formData.descricao?.trim() || null,
            status: formData.status,
            orcamento: orcamentoCentavos,
            prazo: prazoISO,
            designer_id: userId,
            cliente_id: clienteId,
          })
          .select("id")
          .single();

        if (error) throw error;
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting project:", safeErrorToString(error), error);
    } finally {
      setSalvando(false);
    }
  };

  const noClientsAvailable = !souCliente && clientes.length === 0;
  const invalidCliente = !souCliente && !isUuidLike(formData.cliente_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ProjetoForm
            values={formData}
            setValues={(v) => setFormData(v)}
            clientes={clientes}
            souCliente={souCliente}
          />

          {!souCliente && invalidCliente && !noClientsAvailable && (
            <p className="text-xs text-red-600">Selecione um cliente válido.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                salvando ||
                loading ||
                noClientsAvailable ||
                invalidCliente
              }
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
