"use client";
import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, Link as LinkIcon, Copy } from "lucide-react";

type Step = 1 | 2 | 3;

export type ArteWizardProps = {
  projetoId: string;
  userId: string;
  bucketName?: string; // default "artes"
  onFinished?: (arteId: string) => void;
};

const MIME_OPTIONS: { label: string; value: string; exts: string[] }[] = [
  { label: "PDF", value: "application/pdf", exts: ["pdf"] },
  { label: "PNG", value: "image/png", exts: ["png"] },
  { label: "JPEG", value: "image/jpeg", exts: ["jpg", "jpeg"] },
  { label: "SVG", value: "image/svg+xml", exts: ["svg"] },
  { label: "GIF", value: "image/gif", exts: ["gif"] },
  { label: "MP4 (vídeo)", value: "video/mp4", exts: ["mp4"] },
  { label: "WEBM (vídeo)", value: "video/webm", exts: ["webm"] },
];

// helpers de validação
function getSelectedMimeMeta(mime: string | null) {
  return MIME_OPTIONS.find((m) => m.value === mime) || null;
}
function extFromFilename(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}
function mimeMatchesSelection(selectedMime: string, file: File) {
  const meta = getSelectedMimeMeta(selectedMime);
  const byMime = !!file.type && file.type === selectedMime;
  const byExt = meta ? meta.exts.includes(extFromFilename(file.name)) : false;

  // Regras:
  // - se file.type existir, tem que bater com selectedMime
  // - se file.type vier vazio (ex.: alguns .ai), a extensão tem que pertencer ao conjunto permitido
  if (file.type) return byMime;
  return byExt;
}

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
  const [mime, setMime] = useState<string>(MIME_OPTIONS[1].value); // PNG default

  // Passo 2
  const [file, setFile] = useState<File | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);

  // Id da arte criada no Passo 2
  const [arteId, setArteId] = useState<string | null>(null);

  // Passo 3 (opções finais)
  const [notificarAoEnviar, setNotificarAoEnviar] = useState(true);
  const [gerarLinkPublico, setGerarLinkPublico] = useState(false);
  const [somenteLeitura, setSomenteLeitura] = useState(true);
  const [expiraDias, setExpiraDias] = useState<number>(7);
  const [preToken, setPreToken] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (!preToken) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // ajuste a rota se necessário
    return `${origin}/share/${preToken}`;
  }, [preToken]);

  const canStep1 = useMemo(() => !!projetoId && !!userId && nome.trim().length > 0, [projetoId, userId, nome]);
  const canStep2 = useMemo(() => !!file, [file]);

  function next(s: Step) {
    setErr(null);
    setStep(s);
  }

  function handleTogglePublicLink(checked: boolean) {
    setGerarLinkPublico(checked);
    if (checked && !preToken) {
      const t =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setPreToken(t);
    }
    if (!checked) setPreToken(null);
  }

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {}
  }

  /* ---------- Passo 1 ---------- */
  async function step1Continue() {
    if (!canStep1) {
      setErr("Informe ao menos o nome da arte.");
      return;
    }
    next(2);
  }

  /* ---------- Passo 2: upload -> INSERT em artes ---------- */
  async function createArteWithUpload() {
    if (!file) {
      setErr("Selecione um arquivo.");
      return;
    }

    // Validação: tipo/ extensão devem bater com o formato escolhido
    if (!mimeMatchesSelection(mime, file)) {
      const selected = getSelectedMimeMeta(mime);
      const expected = selected ? `${selected.label} (${selected.exts.join(", ")})` : mime;
      const real = file.type || `.${extFromFilename(file.name)}`;
      setErr(`Tipo de arquivo inválido. Esperado: ${expected}. Enviado: ${real}.`);
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      // 1) gerar id da arte
      const newArteId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // 2) MIME final: prioriza file.type se presente (já validado)
      const finalMime = file.type || mime || "application/octet-stream";

      // 3) caminho e versão
      const versao = 1;
      const ext = extFromFilename(file.name) || "bin";
      const path = `${newArteId}/v${versao}/${Date.now()}.${ext}`;

      // 4) upload primeiro
      const { error: upErr } = await supabase.storage.from(bucketName).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        const msg = (upErr as any)?.message || (upErr as any)?.code || "Falha no upload";
        throw new Error(msg);
      }

      // 5) insert em artes
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

      if (insErr) {
        const msg = insErr.message || insErr.code || "Falha ao salvar arte";
        throw new Error(msg);
      }

      setArteId(data.id);
      next(3);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Falha ao enviar arquivo ou salvar a arte.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Passo 3: finalizar ---------- */
  async function finalizeCreate() {
    setBusy(true);
    setErr(null);
    try {
      if (!arteId) throw new Error("arteId ausente. Tente novamente.");

      // link público opcional
      if (gerarLinkPublico && preToken) {
        const expira = new Date();
        expira.setDate(expira.getDate() + Math.max(1, expiraDias));

        const { error: linkErr } = await supabase
          .from("link_compartilhado")
          .insert({
            token: preToken,
            tipo: "ARTE",
            arte_id: arteId,
            expira_em: expira.toISOString(),
            somente_leitura: !!somenteLeitura,
          });

        if (linkErr) {
          const msg = linkErr.message || linkErr.code || "Falha ao criar link";
          throw new Error(msg);
        }
      }

      // notificação opcional (não bloqueante)
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

  /* ---------- UI ---------- */
  return (
    <div className="w-full">
      {/* indicador de passos */}
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

      {/* wrapper com altura consistente */}
      <div className="min-h-[320px] md:min-h-[300px] flex flex-col">
        {/* Passo 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Nome da arte</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Banner - Lançamento"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Brief / observações"
              />
            </div>

            <div>
              <Label>Formato do arquivo (MIME)</Label>
              <Select value={mime} onValueChange={setMime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  {MIME_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label} — {m.value} ({m.exts.map((e) => "." + e).join(", ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Será atualizado automaticamente ao escolher o arquivo.
              </p>
            </div>
          </div>
        )}

        {/* Passo 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed p-6 text-center">
              <Upload className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Arraste e solte um arquivo ou clique para selecionar
              </p>
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  // reset de erro e estado visual
                  setErr(null);
                  setFile(null);
                  setPreviewLocal(null);

                  if (!f) return;

                  // auto preview se imagem
                  const preview = f.type?.startsWith("image/") ? URL.createObjectURL(f) : null;

                  // auto-detecta MIME se houver
                  const selectedWas = mime;
                  if (f.type) {
                    setMime(f.type);
                  }

                  // valida seleção vs arquivo
                  if (!mimeMatchesSelection(selectedWas, f)) {
                    const meta = getSelectedMimeMeta(selectedWas);
                    const expected = meta ? `${meta.label} (${meta.exts.map((e) => "." + e).join(", ")})` : selectedWas;
                    const real = f.type || `.${extFromFilename(f.name)}`;
                    setErr(`O arquivo selecionado é ${real}, mas você escolheu ${expected}.`);
                    return; // não seta file/preview
                  }

                  // ok
                  setFile(f);
                  setPreviewLocal(preview);
                }}
                disabled={busy}
              />
              {previewLocal && (
                <div className="mt-4">
                  <img src={previewLocal} alt="preview" className="max-h-48 mx-auto rounded-md object-contain" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Passo 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="inline-flex items-center gap-3">
                <Switch checked={notificarAoEnviar} onCheckedChange={setNotificarAoEnviar} />
                Notificar ao enviar
              </Label>
              <p className="text-xs text-muted-foreground">
                Envia uma notificação no sistema após a criação.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="inline-flex items-center gap-3">
                <Switch checked={gerarLinkPublico} onCheckedChange={handleTogglePublicLink} />
                Gerar link público
              </Label>
              <p className="text-xs text-muted-foreground">
                Cria um link com token e validade para o cliente visualizar.
              </p>

              {gerarLinkPublico && (
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Expira (dias)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={expiraDias}
                        onChange={(e) => setExpiraDias(Math.max(1, Number(e.target.value || 7)))}
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <Label className="mr-2">Somente leitura</Label>
                      <Switch checked={somenteLeitura} onCheckedChange={setSomenteLeitura} />
                    </div>
                  </div>

                  {preToken && (
                    <div className="space-y-1">
                      <Label>Link</Label>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={shareUrl} className="flex-1" />
                        <Button type="button" variant="outline" size="icon" onClick={copyToClipboard} title="Copiar">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="w-3.5 h-3.5" /> Este link será criado ao clicar em “Criar”.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer sticky — primário à direita */}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-2 border-t bg-background p-4">
        {step > 1 ? (
          <Button variant="secondary" onClick={() => next((step - 1) as Step)} disabled={busy}>
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
