"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listClientes, listDesigners } from "@/lib/projects";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import type { ProjetoInput } from "@/lib/projects";
import { Stepper } from "@/components/ui/stepper";

import type { ClienteOption, UsuarioOption, ProjetoFormValues } from "./ProjetoForm";
import StepBasic from "./forms/StepBasic";
import { projetoSchema, validarCampos } from "@/lib/schemas";
import StepParticipants from "./forms/StepParticipants";
import StepApproval from "./forms/StepApproval";
import StepReview from "./forms/StepReview";
import type { ProjetoExtraPayload } from "./project-extra-types";

import type { StatusProjeto } from "@/components/projetos/ProjetoForm";
import { statusLabel as statusLabelProjeto } from "@/components/projetos/types";
export type ProjetoInitial = {
  id: string; nome: string; descricao?: string | null; status: StatusProjeto;
  orcamento: number; prazo?: string | null; cliente_id?: string | null;
  equipe_id?: string | null;
};

interface DimensionScore {
  score: number;
  justification: string;
}

interface EvalResult {
  passed: boolean;
  verdict: "PASS" | "FAIL";
  scores: Record<string, DimensionScore>;
}

interface ProjetoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ProjetoInitial | null;
  onSubmit?: (values: ProjetoInput & ProjetoExtraPayload & { skipBriefingEval?: boolean; aceiteTermos?: boolean }) => Promise<void>;
}

// CUID gerado no banco: 'c' + 24 hex. O check antigo era v.length === 36
// (tamanho de UUID), que reprovava todo id real e travava o modal.
const isCuidLike = (v?: string | null) => !!v && /^c[a-z0-9]{24}$/i.test(v);

const DIMENSION_LABELS: Record<string, string> = {
  completude: "Completude",
  clareza: "Clareza",
  acionabilidade: "Acionabilidade",
};

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

function BriefingEvalPanel({
  evalResult,
  onImprove,
  onSkip,
  loading,
}: {
  evalResult: EvalResult;
  onImprove: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/40 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            O briefing precisa de melhorias
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
            A análise identificou pontos que podem dificultar o trabalho do designer. Melhore o briefing ou crie o projeto assim mesmo.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(evalResult.scores).map(([key, dim]) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{DIMENSION_LABELS[key] ?? key}</span>
              <Badge variant={dim.score >= 7 ? "default" : dim.score >= 5 ? "secondary" : "destructive"} className="text-xs">
                {dim.score >= 7 ? "Bom" : dim.score >= 5 ? "Regular" : "Fraco"}
              </Badge>
            </div>
            <ScoreBar score={dim.score} />
            <p className="text-xs text-muted-foreground">{dim.justification}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onImprove}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Melhorar briefing
        </Button>
        <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={onSkip} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Criar mesmo assim
        </Button>
      </div>
    </div>
  );
}

export default function ProjetoModal({ open, onOpenChange, initial, onSubmit }: ProjetoModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [designers, setDesigners] = useState<UsuarioOption[]>([]);
  const [souCliente, setSouCliente] = useState(false);
  const [step, setStep] = useState(0);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [aceiteTermos, setAceiteTermos] = useState(false);

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
    equipe_id: null,
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

  useEffect(() => {
    const boot = async () => {
      if (!open) return;
      setLoading(true);
      setEvalResult(null);
      setAceiteTermos(false);
      try {
        const isCli = user?.tipo === "CLIENTE";
        setSouCliente(isCli);
        if (isCli && user?.id) {
          setFormData((prev) => ({ ...prev, cliente_id: user.id }));
        }

        const [cliList, desList] = await Promise.all([listClientes(), listDesigners()]);
        setClientes(cliList);
        setDesigners(desList);

        if (!isCli && !formData.cliente_id && cliList.length > 0) {
          setFormData((prev) => ({ ...prev, cliente_id: cliList[0].id }));
        }

        setStep(0);
      } catch (e) {
        console.error("Erro ao carregar modal:", e);
      } finally {
        setLoading(false);
      }
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        equipe_id: initial.equipe_id ?? null,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        nome: "", descricao: "", status: "EM_ANDAMENTO", orcamento: 0, prazo: "", cliente_id: prev.cliente_id || "",
        equipe_id: null,
      }));
    }
    setEvalResult(null);
    setAceiteTermos(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  /**
   * Erros do primeiro passo, pelas mesmas regras do backend (lib/schemas).
   * Antes o botão "Próximo" só ficava cinza com um title genérico — a pessoa
   * não sabia qual campo estava errado.
   *
   * Quando quem cria é o próprio cliente, o cliente do projeto é ele mesmo e
   * o campo nem aparece; por isso ele sai da validação nesse caso.
   */
  const errosBasic = useMemo(() => {
    const resultado = validarCampos(projetoSchema, {
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      orcamento: formData.orcamento,
      clienteId: souCliente ? (user?.id ?? null) : (formData.cliente_id || null),
      equipeId: formData.equipe_id || null,
      prazo: formData.prazo || undefined,
    });
    return resultado.ok ? {} : resultado.erros;
  }, [formData, souCliente, user?.id]);

  const invalidBasic = Object.keys(errosBasic).length > 0;

  const handleSubmitFinal = async (skipBriefingEval = false) => {
    setSalvando(true);
    try {
      const clienteId = souCliente ? (user?.id ?? null) : (isCuidLike(formData.cliente_id) ? formData.cliente_id : null);
      if (!clienteId) throw new Error("Selecione um cliente.");

      const prazoISO: string | null = formData.prazo ? new Date(formData.prazo).toISOString() : null;

      const baseValues: ProjetoInput = {
        nome: formData.nome.trim(),
        descricao: formData.descricao?.trim() || undefined,
        status: formData.status,
        prazo: prazoISO,
        cliente_id: clienteId,
        equipe_id: formData.equipe_id,
        orcamento: Number.isFinite(formData.orcamento) ? formData.orcamento : 0,
      };

      const extra: ProjetoExtraPayload = {
        aprovacao: { ...formData.aprovacao },
        participantes: { ...formData.participantes },
      };

      if (onSubmit) {
        await onSubmit({ ...baseValues, ...extra, skipBriefingEval, aceiteTermos: !initial && aceiteTermos });
        onOpenChange(false);
      }
    } catch (err: any) {
      if (err?.status === 422 && err?.body?.evalResult) {
        setEvalResult(err.body.evalResult as EvalResult);
        return;
      }
      console.error("Erro ao salvar projeto:", err?.message ?? err);
    } finally {
      setSalvando(false);
    }
  };

  const resumo = useMemo(() => {
    const nomeCliente = clientes.find((c) => c.id === formData.cliente_id)?.nome;
    const designersAd = formData.participantes.designersAdicionaisIds
      .map((id) => designers.find((d) => d.id === id)?.nome || id);
    const clientesAd = formData.participantes.clientesAdicionaisIds
      .map((id) => clientes.find((c) => c.id === id)?.nome || id);
    const aprovadores = formData.aprovacao.aprovadoresClienteIds
      .map((id) => clientes.find((c) => c.id === id)?.nome || id);
    const statusLabel = statusLabelProjeto(formData.status);
    const orcFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(formData.orcamento || 0);
    const prazoFmt = formData.prazo ? new Date(formData.prazo).toLocaleDateString("pt-BR") : undefined;
    return {
      nome: formData.nome, cliente: nomeCliente, prazo: prazoFmt, orcamento: orcFmt,
      status: statusLabel, designersAdicionais: designersAd, clientesAdicionais: clientesAd,
      aprovadores, exigirAprovDesigner: formData.aprovacao.exigirAprovacaoDesigner,
      todosObrigatorios: formData.aprovacao.todosAprovadoresSaoObrigatorios,
      overrideOwner: formData.aprovacao.permitirOverrideOwner,
      prazoAprovDias: formData.aprovacao.prazoAprovacaoDias ?? null,
    };
  }, [formData, clientes, designers]);

  const isLastStep = step === steps.length - 1;
  const submitDisabled = salvando || loading || (isLastStep && !initial && !aceiteTermos);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>

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

        <div className="min-h-[260px]">
          {evalResult ? (
            <BriefingEvalPanel
              evalResult={evalResult}
              onImprove={() => { setEvalResult(null); setStep(0); }}
              onSkip={() => handleSubmitFinal(true)}
              loading={salvando}
            />
          ) : (
            <>
              {step === 0 && (
                <StepBasic
                  values={formData}
                  setValues={setFormData}
                  souCliente={souCliente}
                  erros={errosBasic}
                />
              )}
              {step === 1 && <StepParticipants values={formData} setValues={setFormData} souCliente={souCliente} />}
              {step === 2 && <StepApproval values={formData} setValues={setFormData} />}
              {step === 3 && <StepReview resumo={resumo} />}
            </>
          )}
        </div>

        {/* Aceite de termos – apenas na etapa de revisão ao criar um novo projeto */}
        {!evalResult && isLastStep && !initial && (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
            <Checkbox
              id="aceite-termos"
              checked={aceiteTermos}
              onCheckedChange={(v) => setAceiteTermos(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="aceite-termos" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
              Li e aceito os{' '}
              <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-primary">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline text-foreground hover:text-primary">
                Política de Privacidade
              </a>
              . Confirmo que o briefing é verídico e concordo com as condições de entrega e pagamento. (Lei 14.063/20)
            </label>
          </div>
        )}

        {!evalResult && (
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => (step > 0 ? setStep(step - 1) : onOpenChange(false))}>
              {step > 0 ? "Voltar" : "Cancelar"}
            </Button>

            {!isLastStep ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && (loading || invalidBasic)}
                title={step === 0 && invalidBasic ? Object.values(errosBasic)[0] : undefined}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmitFinal(false)}
                disabled={submitDisabled}
                title={!initial && !aceiteTermos ? "Aceite os termos para continuar" : undefined}
              >
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initial ? "Salvar" : "Criar"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
