"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ProjetoInput } from "@/lib/projects";
import { Stepper } from "@/components/ui/stepper";

import type { ClienteOption, UsuarioOption, ProjetoFormValues } from "./ProjetoForm";
import StepBasic from "./forms/StepBasic";
import StepParticipants from "./forms/StepParticipants";
import StepApproval from "./forms/StepApproval";
import StepReview from "./forms/StepReview";
import type { ProjetoExtraPayload } from "./project-extra-types";

// ===== tipos originais =====
type StatusProjeto = "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
export type ProjetoInitial = {
  id: string; nome: string; descricao?: string | null; status: StatusProjeto;
  orcamento: number; prazo?: string | null; cliente_id?: string | null;
};

interface ProjetoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ProjetoInitial | null;
  onSubmit?: (values: ProjetoInput & ProjetoExtraPayload) => Promise<void>;
}

// ===== utils (mesmos que você já tinha) =====
function safeErrorToString(err: unknown) {
  try {
    if (!err) return "Erro desconhecido";
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message || (err as any).name || "Erro";
    if (typeof err === "object") {
      const anyErr = err as any;
      if (anyErr.message) return anyErr.message;
      return JSON.stringify(err);
    }
    return String(err);
  } catch {
    return "Erro ao serializar o erro";
  }
}
const isUuidLike = (v?: string | null) => !!v && v.length === 36;
async function ensureUsuarioExiste() {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const u = auth?.user;
  if (!u) throw new Error("Não autenticado.");
  const { data: me, error: meErr } = await supabase.from("usuarios").select("id").eq("id", u.id).maybeSingle();
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

// ===== componente =====
export default function ProjetoModal({ open, onOpenChange, initial, onSubmit }: ProjetoModalProps) {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [designers, setDesigners] = useState<UsuarioOption[]>([]);
  const [souCliente, setSouCliente] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    { key: "basic", label: "Básico" },
    { key: "participants", label: "Participantes" },
    { key: "approval", label: "Aprovação" },
    { key: "review", label: "Revisão" },
  ] as const;

  const [formData, setFormData] = useState<ProjetoFormValues>({
    nome: "",
    descricao: "",
    status: "EM_ANDAMENTO",
    orcamento: 0,
    prazo: "",
    cliente_id: "",
    aprovacao: {
      exigirAprovacaoDesigner: true,
      aprovadoresClienteIds: [],
      todosAprovadoresSaoObrigatorios: true,
      permitirOverrideOwner: true,
      prazoAprovacaoDias: null,
    },
    participantes: {
      designersAdicionaisIds: [],
      clientesAdicionaisIds: [],
    },
  });

  // Boot
  useEffect(() => {
    const boot = async () => {
      if (!open) return;
      setLoading(true);
      try {
        await ensureUsuarioExiste();
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id ?? null;

        if (userId) {
          const { data: me } = await supabase.from("usuarios").select("id, tipo").eq("id", userId).maybeSingle();
          if (me?.tipo === "CLIENTE") {
            setSouCliente(true);
            setFormData((prev) => ({ ...prev, cliente_id: me.id }));
          } else {
            setSouCliente(false);
          }
        }

        const [cli, des] = await Promise.all([
          supabase.from("usuarios").select("id, nome").eq("tipo", "CLIENTE").eq("ativo", true).order("nome"),
          supabase.from("usuarios").select("id, nome").eq("tipo", "DESIGNER").eq("ativo", true).order("nome"),
        ]);
        if (cli.error) throw cli.error;
        if (des.error) throw des.error;

        setClientes((cli.data ?? []).map((c) => ({ id: c.id as string, nome: c.nome as string })));
        setDesigners((des.data ?? []).map((d) => ({ id: d.id as string, nome: d.nome as string })));

        // auto-select 1º cliente se não for cliente logado
        if (!souCliente && !formData.cliente_id && (cli.data ?? []).length > 0) {
          setFormData((prev) => ({ ...prev, cliente_id: (cli.data![0].id as string) }));
        }

        setStep(0); // sempre começa no passo 0 ao abrir
      } catch (e) {
        console.error("Erro boot modal projeto:", safeErrorToString(e));
      } finally {
        setLoading(false);
      }
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Editar
  useEffect(() => {
    if (initial) {
      setFormData((prev) => ({
        ...prev,
        nome: initial.nome,
        descricao: initial.descricao || "",
        status: initial.status,
        orcamento: (initial.orcamento ?? 0) / 100,
        prazo: initial.prazo ? initial.prazo.substring(0, 10) : "",
        cliente_id: initial.cliente_id ?? prev.cliente_id ?? "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        nome: "", descricao: "", status: "EM_ANDAMENTO", orcamento: 0, prazo: "", cliente_id: prev.cliente_id || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  // ===== validações por step =====
  const invalidBasic = useMemo(() => {
    const nomeOk = formData.nome.trim().length > 0;
    const orcOk = Number.isFinite(formData.orcamento);
    const cliOk = souCliente || isUuidLike(formData.cliente_id);
    return !(nomeOk && orcOk && cliOk);
  }, [formData, souCliente]);

  // participantes: nada obrigatório
  // aprovação: se marcou aprovadores, ok; se não marcou e "todos obrigatórios" = true, continua ok (opções livres)

  // ===== submissão =====
  const handleSubmitFinal = async () => {
    setSalvando(true);
    try {
      await ensureUsuarioExiste();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      const clienteId = souCliente ? userId : (isUuidLike(formData.cliente_id) ? formData.cliente_id! : null);
      if (!clienteId) throw new Error("Selecione um cliente.");

      const prazoISO: string | null = formData.prazo ? new Date(formData.prazo).toISOString() : null;

      const baseValues: ProjetoInput = {
        nome: formData.nome.trim(),
        descricao: formData.descricao?.trim() || undefined,
        status: formData.status,
        prazo: prazoISO,
        cliente_id: clienteId,
        orcamento: Number.isFinite(formData.orcamento) ? formData.orcamento : 0,
      };
      const extra: ProjetoExtraPayload = {
        aprovacao: { ...formData.aprovacao },
        participantes: { ...formData.participantes },
      };

      if (onSubmit) {
        await onSubmit({ ...baseValues, ...extra });
      } else {
        // fallback simples (sem extras)
        const orcCents = Math.round((baseValues.orcamento ?? 0) * 100);
        const { error } = await supabase.from("projetos").insert({
          nome: baseValues.nome,
          descricao: baseValues.descricao ?? null,
          status: baseValues.status,
          orcamento: orcCents,
          prazo: baseValues.prazo,
          designer_id: userId,
          cliente_id: baseValues.cliente_id,
        }).select("id").single();
        if (error) throw error;
      }

      onOpenChange(false);
    } catch (e) {
      console.error("Erro ao salvar:", safeErrorToString(e));
    } finally {
      setSalvando(false);
    }
  };

  // ===== resumo para a revisão =====
  const resumo = useMemo(() => {
    const nomeCliente = clientes.find(c => c.id === formData.cliente_id)?.nome;
    const designersAd = formData.participantes.designersAdicionaisIds
      .map(id => designers.find(d => d.id === id)?.nome || id);
    const clientesAd  = formData.participantes.clientesAdicionaisIds
      .map(id => clientes.find(c => c.id === id)?.nome || id);
    const aprovadores = formData.aprovacao.aprovadoresClienteIds
      .map(id => clientes.find(c => c.id === id)?.nome || id);

    const statusLabel = formData.status === "EM_ANDAMENTO" ? "Em andamento" :
                        formData.status === "CONCLUIDO" ? "Concluído" : "Pausado";
    const orcFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(formData.orcamento || 0);
    const prazoFmt = formData.prazo ? new Date(formData.prazo).toLocaleDateString("pt-BR") : undefined;

    return {
      nome: formData.nome,
      cliente: nomeCliente,
      prazo: prazoFmt,
      orcamento: orcFmt,
      status: statusLabel,
      designersAdicionais: designersAd,
      clientesAdicionais: clientesAd,
      aprovadores,
      exigirAprovDesigner: formData.aprovacao.exigirAprovacaoDesigner,
      todosObrigatorios: formData.aprovacao.todosAprovadoresSaoObrigatorios,
      overrideOwner: formData.aprovacao.permitirOverrideOwner,
      prazoAprovDias: formData.aprovacao.prazoAprovacaoDias ?? null,
    };
  }, [formData, clientes, designers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="mb-4">
          <Stepper
            steps={[
              { key: "basic", label: "Básico" },
              { key: "participants", label: "Participantes" },
              { key: "approval", label: "Aprovação" },
              { key: "review", label: "Revisão" },
            ]}
            current={step}
          />
        </div>

          {/* Conteúdo */}
          <div className="min-h-[260px]">
            {step === 0 && (
              <StepBasic
                values={formData}
                setValues={setFormData}
                souCliente={souCliente}
              />
            )}
            {step === 1 && (
              <StepParticipants
                values={formData}
                setValues={setFormData}
                souCliente={souCliente}
              />
            )}
            {step === 2 && (
              <StepApproval
                values={formData}
                setValues={setFormData}
              />
            )}
            {step === 3 && <StepReview resumo={resumo} />}
          </div>


        {/* Navegação */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => (step > 0 ? setStep(step - 1) : onOpenChange(false))}>
            {step > 0 ? "Voltar" : "Cancelar"}
          </Button>

          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={(step === 0 && (loading || invalidBasic))}
              title={step === 0 && invalidBasic ? "Preencha nome, valor e cliente" : undefined}
            >
              Próximo
            </Button>
          ) : (
            <Button onClick={handleSubmitFinal} disabled={salvando || loading}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? "Salvar" : "Criar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
