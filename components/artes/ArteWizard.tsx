// components/artes/ArteWizard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import StepDetails from "./wizard/StepDetails";
import StepUpload from "./wizard/StepUpload";
import StepOptions from "./wizard/StepOptions";
import {
  Step,
  sanitizeFilename,
  mimeMatchesSelection,
} from "./wizard/helpers";

export type ArteWizardProps = {
  projetoId: string;
  onFinished?: (arteId: string) => void;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (backend enforces per-category)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("viu_token");
}

export default function ArteWizard({ projetoId, onFinished }: ArteWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 1
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mime, setMime] = useState<string>("image/png");

  // Step 2
  const [file, setFile] = useState<File | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);

  // Arte criada
  const [arteId, setArteId] = useState<string | null>(null);

  // Step 3
  const [notificarAoEnviar, setNotificarAoEnviar] = useState(true);
  const [gerarLinkPublico, setGerarLinkPublico] = useState(false);
  const [somenteLeitura, setSomenteLeitura] = useState(true);
  const [expiraDias, setExpiraDias] = useState<number>(7);
  const [preToken, setPreToken] = useState<string | null>(null);

  const canStep1 = useMemo(() => !!projetoId && nome.trim().length > 0, [projetoId, nome]);
  const canStep2 = useMemo(() => !!file, [file]);

  function next(s: Step) {
    setErr(null);
    setStep(s);
  }

  async function step1Continue() {
    if (!canStep1) { setErr("Informe ao menos o nome da arte."); return; }
    next(2);
  }

  /* ---------- Step 2: upload multipart → POST /artes/upload ---------- */
  async function createArteWithUpload() {
    if (!file) { setErr("Selecione um arquivo."); return; }
    if (!mimeMatchesSelection(mime, file)) {
      setErr("Tipo/Extensão do arquivo não confere com o formato escolhido.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErr(`Arquivo excede 100MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const form = new FormData();
      form.set("file", file, file.name);
      form.set("nome", nome.trim());
      form.set("projetoId", projetoId);
      if (descricao.trim()) form.set("descricao", descricao.trim());

      const token = getToken();
      const res = await fetch(`${BASE_URL}/artes/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Erro ${res.status}`);
      }

      const body = await res.json();
      const id = body?.data?.id;
      if (!id) throw new Error("Resposta inesperada do servidor.");

      setArteId(id);
      next(3);
    } catch (e: any) {
      setErr(e?.message || "Falha ao enviar arquivo.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Step 3: opcionais (link público) ---------- */
  async function finalizeCreate() {
    if (!arteId) { setErr("arteId ausente. Tente novamente."); return; }
    setBusy(true);
    setErr(null);
    try {
      if (gerarLinkPublico) {
        const token = getToken();
        const expiraEm = new Date(Date.now() + expiraDias * 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(`${BASE_URL}/links`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ arteId, expiraEm, somenteLeitura }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message ?? "Falha ao criar link.");
        }
      }

      onFinished?.(arteId);
    } catch (e: any) {
      setErr(e?.message || "Falha ao finalizar a criação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
        {(["1. Detalhes", "2. Upload", "3. Opções"] as const).map((label, i) => (
          <div
            key={label}
            className={`rounded-full py-1 text-center ${
              step >= i + 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="min-h-[320px] md:min-h-[300px] flex flex-col">
        {step === 1 && (
          <StepDetails
            nome={nome} descricao={descricao} mime={mime}
            setNome={setNome} setDescricao={setDescricao} setMime={setMime}
          />
        )}
        {step === 2 && (
          <StepUpload
            mime={mime} busy={busy} file={file}
            setFile={setFile} setErr={setErr} onPreview={setPreviewLocal}
          />
        )}
        {step === 3 && (
          <>
            <StepOptions
              notificarAoEnviar={notificarAoEnviar}
              setNotificarAoEnviar={setNotificarAoEnviar}
              gerarLinkPublico={gerarLinkPublico}
              setGerarLinkPublico={setGerarLinkPublico}
              somenteLeitura={somenteLeitura}
              setSomenteLeitura={setSomenteLeitura}
              expiraDias={expiraDias}
              setExpiraDias={setExpiraDias}
              preToken={preToken}
              setPreToken={setPreToken}
            />
            <Separator className="my-4" />
            {previewLocal && (
              <div className="rounded-md border bg-muted/30 p-2 text-xs">
                Preview carregado localmente (não assinado).
              </div>
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-2 border-t bg-background p-4">
        {step > 1 ? (
          <Button variant="secondary" onClick={() => setStep((step - 1) as Step)} disabled={busy}>
            Voltar
          </Button>
        ) : (
          <span />
        )}

        {step === 1 && (
          <Button onClick={step1Continue} disabled={busy || !canStep1}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuar
          </Button>
        )}
        {step === 2 && (
          <Button onClick={createArteWithUpload} disabled={busy || !canStep2}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuar
          </Button>
        )}
        {step === 3 && (
          <Button onClick={finalizeCreate} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar
          </Button>
        )}
      </div>
    </div>
  );
}
