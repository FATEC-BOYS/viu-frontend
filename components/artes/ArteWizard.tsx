"use client";
import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import StepDetails from "./wizard/StepDetails";
import StepUpload from "./wizard/StepUpload";
import StepOptions from "./wizard/StepOptions";
import {
  Step, randomId, sanitizeFilename, parseStorageError, mimeMatchesSelection,
} from "./wizard/helpers";

export type ArteWizardProps = {
  projetoId: string;
  userId: string;
  bucketName?: string; // default "artes"
  onFinished?: (arteId: string) => void;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (igual ao bucket, ajuste se mudar bucket)

export default function ArteWizard({
  projetoId,
  userId,
  bucketName = "artes",
  onFinished,
}: ArteWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Passo 1
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mime, setMime] = useState<string>("image/png"); // default PNG

  // Passo 2
  const [file, setFile] = useState<File | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);

  // Arte criada
  const [arteId, setArteId] = useState<string | null>(null);

  // Passo 3
  const [notificarAoEnviar, setNotificarAoEnviar] = useState(true);
  const [gerarLinkPublico, setGerarLinkPublico] = useState(false);
  const [somenteLeitura, setSomenteLeitura] = useState(true);
  const [expiraDias, setExpiraDias] = useState<number>(7);
  const [preToken, setPreToken] = useState<string | null>(null);

  const canStep1 = useMemo(() => !!projetoId && !!userId && nome.trim().length > 0, [projetoId, userId, nome]);
  const canStep2 = useMemo(() => !!file, [file]);

  function next(s: Step) {
    setErr(null);
    setStep(s);
  }

  /* ---------- Step 1: continuar ---------- */
  async function step1Continue() {
    if (!canStep1) {
      setErr("Informe ao menos o nome da arte.");
      return;
    }
    next(2);
  }

  /* ---------- Step 2: upload + insert ---------- */
  async function createArteWithUpload() {
    if (!file) {
      setErr("Selecione um arquivo.");
      return;
    }
    // validação de tipo e tamanho
    if (!mimeMatchesSelection(mime, file)) {
      setErr(`Tipo/Extensão do arquivo não confere com o formato escolhido.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErr(`Arquivo excede 20MB (${(file.size/1024/1024).toFixed(1)}MB).`);
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const newArteId = randomId();
      const versao = 1;
      const ext = (file.name.split(".").pop() || "").toLowerCase() || "bin";
      const safeName = sanitizeFilename(file.name || `arquivo.${ext}`);
      const path = `${projetoId}/${newArteId}/v${versao}/${safeName}`;
      const finalMime = file.type || mime || "application/octet-stream";

      // upload 1º
      const { error: upErr } = await supabase.storage.from(bucketName).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      // insert em artes
      const { data, error: insErr } = await supabase
        .from("artes")
        .insert({
          id: newArteId,
          projeto_id: projetoId,
          autor_id: userId,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          arquivo: path,
          tipo: finalMime,
          tamanho: file.size,
          versao,
          status: "EM_ANALISE",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      setArteId(data.id);
      next(3);
    } catch (e: any) {
      console.error(e);
      setErr(`Falha ao enviar arquivo ou salvar a arte: ${parseStorageError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Step 3: finalizar ---------- */
  async function finalizeCreate() {
    setBusy(true);
    setErr(null);
    try {
      if (!arteId) throw new Error("arteId ausente. Tente novamente.");

      // link público opcional
      if (gerarLinkPublico && preToken) {
        const expira = new Date();
        expira.setDate(expira.getDate() + Math.max(1, expiraDias));
        const { error: linkErr } = await supabase.from("link_compartilhado").insert({
          token: preToken,
          tipo: "ARTE",
          arte_id: arteId,
          expira_em: expira.toISOString(),
          somente_leitura: !!somenteLeitura,
        });
        if (linkErr) throw linkErr;
      }

      // notificação (best-effort)
      if (notificarAoEnviar) {
        await supabase.from("notificacoes").insert({
          titulo: "Arte criada",
          conteudo: `${nome.trim()} — versão 1`,
          tipo: "ARTE",
          canal: "SISTEMA",
          usuario_id: userId,
        });
      }

      onFinished?.(arteId);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Falha ao finalizar a criação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      {/* stepper */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
        <div className={`rounded-full py-1 text-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>1. Detalhes</div>
        <div className={`rounded-full py-1 text-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2. Upload</div>
        <div className={`rounded-full py-1 text-center ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>3. Opções</div>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <div className="min-h-[320px] md:min-h-[300px] flex flex-col">
        {step === 1 && (
          <StepDetails
            nome={nome}
            descricao={descricao}
            mime={mime}
            setNome={setNome}
            setDescricao={setDescricao}
            setMime={setMime}
          />
        )}

        {step === 2 && (
          <StepUpload
            mime={mime}
            busy={busy}
            file={file}
            setFile={setFile}
            setErr={setErr}
            onPreview={setPreviewLocal}
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

      {/* footer */}
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
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continuar
          </Button>
        )}
        {step === 2 && (
          <Button onClick={createArteWithUpload} disabled={busy || !canStep2}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continuar
          </Button>
        )}
        {step === 3 && (
          <Button onClick={finalizeCreate} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Criar
          </Button>
        )}
      </div>
    </div>
  );
}
