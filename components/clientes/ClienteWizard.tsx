// components/clientes/ClienteWizard.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: (clienteId: string) => void; };
type Contato = { nome: string; email: string; telefone: string };
type ProjetoForm = { nome: string; prazo: string; orcamento: string };

function centsFromBRLString(v?: string) {
  if (!v) return 0;
  const onlyDigits = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(onlyDigits);
  return isNaN(num) ? 0 : Math.round(num * 100);
}
function formatTodayISO(date?: Date) {
  const d = date ?? new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 40);
}

/** === DEBUG/ERROS RICOS === */
function asError(e: unknown): Error {
  if (e instanceof Error) return e;
  try { return new Error(JSON.stringify(e)); } catch { return new Error(String(e)); }
}
function fail(label: string, payload?: any): never {
  // eslint-disable-next-line no-console
  console.error(`[${label}]`, payload ?? "(sem payload)");
  const msg =
    (payload?.message as string) ||
    (payload?.error?.message as string) ||
    (typeof payload === "string" ? payload : "") ||
    label;
  throw new Error(`${label}: ${msg}`);
}
function hasRealError(err: any) {
  if (!err) return false;
  if (typeof err === "string") return err.trim().length > 0;
  if (typeof err === "object") {
    const keys = Object.keys(err);
    if (keys.length === 0) return false; // {} não é erro real
    return Boolean(err.message || err.code || err.details || err.hint);
  }
  return true;
}
function assertOk<T>(label: string, res: { data: T; error: any }) {
  if (hasRealError(res?.error)) fail(label, res.error);
  if (res?.data === undefined || res?.data === null) {
    // eslint-disable-next-line no-console
    console.error(`[${label}] sem data`, res);
    fail(label, { message: "Resposta sem data." });
  }
  return res.data;
}

const steps = [
  { id: 0, title: "Cliente", desc: "Dados básicos do cliente" },
  { id: 1, title: "Projeto (opcional)", desc: "Configure um projeto inicial" },
  { id: 2, title: "Contatos (opcional)", desc: "Adicione pessoas de contato" },
  { id: 3, title: "Revisão", desc: "Confirme e crie" },
] as const;

export default function ClienteWizard({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const current = steps[step];
  const [submitting, setSubmitting] = useState(false);

  // Step 0 — Cliente
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [ativo, setAtivo] = useState(true);

  // Step 1 — Projeto (opcional)
  const [criarProjeto, setCriarProjeto] = useState(false);
  const [proj, setProj] = useState<ProjetoForm>({ nome: "", prazo: formatTodayISO(), orcamento: "" });

  // Step 2 — Contatos (opcional)
  const [addContatos, setAddContatos] = useState(false);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const addContato = () => setContatos((prev) => [...prev, { nome: "", email: "", telefone: "" }]);
  const rmContato = (i: number) => setContatos((prev) => prev.filter((_, idx) => idx !== i));
  const setContato = (i: number, patch: Partial<Contato>) =>
    setContatos((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  // atalhos
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (submitting) return;
      if (e.key === "Enter" && !e.shiftKey) {
        if (!isLast) { e.preventDefault(); handleNext(); }
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault(); if (!isFirst) setStep((s) => s - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, isFirst, isLast, submitting]);

  // preview avatar
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(""); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function validateStep(s = step) {
    if (s === 0) {
      if (!nome.trim()) return toast.error("Informe o nome do cliente"), false;
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("E-mail inválido"), false;
    }
    if (s === 1 && criarProjeto) {
      if (!proj.nome.trim()) return toast.error("Informe o nome do projeto"), false;
      if (proj.prazo && isNaN(new Date(proj.prazo).getTime())) return toast.error("Prazo inválido"), false;
    }
    if (s === 2 && addContatos) {
      for (const c of contatos) {
        if (!c.nome.trim()) return toast.error("Contato sem nome"), false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return toast.error("Contato com e-mail inválido"), false;
      }
    }
    return true;
  }
  const handleNext = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, steps.length - 1)); };

  async function uploadAvatarIfNeeded(authUserId: string): Promise<string> {
    if (!avatarFile) return avatarUrl?.trim() ?? "";

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowed.includes(avatarFile.type)) fail("Upload do avatar", { message: "Formato não suportado (PNG, JPG, WEBP, GIF)." });
    if (avatarFile.size > 4 * 1024 * 1024) fail("Upload do avatar", { message: "Avatar muito grande (máx. 4 MB)." });

    const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "png";
    const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const key = `${authUserId}/clientes/${uuid}-${slugify(nome || "cliente")}.${ext}`;

    const uploadRes = await supabase.storage.from("avatars").upload(key, avatarFile, { upsert: true, contentType: avatarFile.type });
    assertOk("Upload do avatar", uploadRes as any);

    const { data } = supabase.storage.from("avatars").getPublicUrl(key);
    return data?.publicUrl ?? "";
  }

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;

    try {
      setSubmitting(true);

      // 0) AUTH
      const authRes = await supabase.auth.getUser();
      const authUser = authRes?.data?.user;
      if (!authUser) fail("Autenticação", authRes);

      // 1) UPLOAD (se necessário)
      let finalAvatarUrl = avatarUrl?.trim() ?? "";
      try {
        finalAvatarUrl = await uploadAvatarIfNeeded(authUser.id);
      } catch (e) {
        const err = asError(e);
        toast.error(err.message);
        // segue sem avatar se falhar
      }

      // 2) MAPEAR auth_user -> usuarios.id (designer)
      const mapRes = await supabase.from("usuario_auth").select("usuario_id").eq("auth_user_id", authUser.id).single();
      const mapData = assertOk<{ usuario_id: string }>("Mapeamento usuario_auth", mapRes as any);
      const designerUsuarioId = mapData?.usuario_id as string;
      if (!designerUsuarioId) fail("Mapeamento usuario_auth", { message: "usuario_id não encontrado para o usuário logado." });

      // 3) CRIAR CLIENTE
      const clienteRes = await supabase
        .from("usuarios")
        .insert({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone || null,
          avatar: finalAvatarUrl || null,
          tipo: "CLIENTE",
          ativo,
        })
        .select("id")
        .single();

      const cliente = assertOk<{ id: string }>("Criar cliente", clienteRes as any);
      if (!cliente?.id) {
        // eslint-disable-next-line no-console
        console.error("[Criar cliente] resposta inesperada", clienteRes);
        fail("Criar cliente", { message: "Não retornou id do cliente." });
      }
      const clienteId = cliente.id;

      // 4) PROJETO OPCIONAL
      if (criarProjeto && proj.nome.trim()) {
        const orcCents = centsFromBRLString(proj.orcamento);
        const prazoISO = proj.prazo ? new Date(proj.prazo).toISOString() : null;

        const projRes = await supabase.from("projetos").insert({
          nome: proj.nome.trim(),
          descricao: null,
          status: "EM_ANDAMENTO",
          orcamento: orcCents || null,
          prazo: prazoISO,
          designer_id: designerUsuarioId,
          cliente_id: clienteId,
        });
        assertOk("Criar projeto inicial", projRes as any);
      }

      // 5) CONTATOS OPCIONAIS
      if (addContatos && contatos.length > 0) {
        const rows = contatos.map((ct) => ({
          owner_id: designerUsuarioId,
          contato_usuario_id: null,
          email: ct.email.trim(),
          nome: ct.nome.trim(),
          tipo: "CLIENTE",
        }));
        const ctRes = await supabase.from("contatos").insert(rows);
        assertOk("Criar contatos", ctRes as any);
      }

      toast.success("Cliente criado com sucesso!");
      onCreated?.(clienteId);
      handleClose();
    } catch (err) {
      const e = asError(err);
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error(e.message || "Não foi possível concluir o cadastro.");
    } finally {
      setSubmitting(false);
    }
  };

  function handleClose() { resetAll(); onOpenChange(false); }
  function resetAll() {
    setStep(0); setSubmitting(false);
    setNome(""); setEmail(""); setTelefone("");
    setAvatarUrl(""); setAvatarFile(null); setAvatarPreview("");
    setAtivo(true); setCriarProjeto(false);
    setProj({ nome: "", prazo: formatTodayISO(), orcamento: "" });
    setAddContatos(false); setContatos([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAll(); onOpenChange(v); }}>
      <DialogContent className="max-w-xl">
        {/* close topo-direito */}
        <DialogClose asChild>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" title="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Use <kbd>Enter</kbd> para avançar e <kbd>Shift</kbd>+<kbd>Enter</kbd> para voltar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{current.title}</p>
              <p className="text-xs text-muted-foreground">{current.desc}</p>
            </div>
            <Badge variant="secondary">{step + 1} / {steps.length}</Badge>
          </div>
          <Progress value={progress} />
        </div>

        {/* FORM */}
        <form onSubmit={onSubmit} className="space-y-6">
          {/* 0 - Cliente */}
          {step === 0 && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt="preview" className="w-16 h-16 object-cover" />
                    ) : avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="avatar" className="w-16 h-16 object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">sem foto</span>
                    )}
                  </div>
                  <div className="flex-1 grid gap-2">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      disabled={submitting}
                    />
                    <div className="grid gap-1">
                      <Label htmlFor="avatar-url" className="text-xs">ou URL direta</Label>
                      <Input
                        id="avatar-url"
                        placeholder="https://…"
                        value={avatarUrl}
                        onChange={(e) => { setAvatarUrl(e.target.value); setAvatarFile(null); }}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" value={nome} onChange={(e)=>setNome(e.target.value)} placeholder="Ex.: Acme S.A." disabled={submitting} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="contato@empresa.com" disabled={submitting} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={telefone} onChange={(e)=>setTelefone(e.target.value)} placeholder="(11) 9 8765-4321" disabled={submitting} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ativo" checked={ativo} onCheckedChange={(v)=>setAtivo(!!v)} disabled={submitting} />
                <Label htmlFor="ativo" className="text-sm">Ativo</Label>
              </div>
            </div>
          )}

          {/* 1 - Projeto */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox id="criarProjeto" checked={criarProjeto} onCheckedChange={(v)=>setCriarProjeto(!!v)} disabled={submitting} />
                <Label htmlFor="criarProjeto" className="text-sm">Criar projeto inicial</Label>
              </div>

              {criarProjeto && (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="proj-nome">Nome do projeto *</Label>
                    <Input id="proj-nome" value={proj.nome} onChange={(e)=>setProj((p)=>({...p, nome: e.target.value}))} placeholder="Logo para campanha X" disabled={submitting} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="proj-prazo">Prazo (opcional)</Label>
                    <Input id="proj-prazo" type="date" value={proj.prazo} onChange={(e)=>setProj((p)=>({...p, prazo: e.target.value}))} disabled={submitting} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="proj-orc">Orçamento (BRL, opcional)</Label>
                    <Input id="proj-orc" value={proj.orcamento} onChange={(e)=>setProj((p)=>({...p, orcamento: e.target.value}))} placeholder="R$ 10.000,00" disabled={submitting} />
                    <p className="text-[11px] text-muted-foreground">Convertido para centavos ao salvar.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2 - Contatos */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox id="addContatos" checked={addContatos} onCheckedChange={(v)=>setAddContatos(!!v)} disabled={submitting} />
                <Label htmlFor="addContatos" className="text-sm">Adicionar contatos</Label>
              </div>

              {addContatos && (
                <div className="space-y-3">
                  {contatos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato adicionado ainda.</p>}
                  {contatos.map((c, idx) => (
                    <div key={idx} className="rounded-md border p-3 grid gap-3">
                      <div className="grid gap-2">
                        <Label>Nome *</Label>
                        <Input value={c.nome} onChange={(e)=>setContato(idx, { nome: e.target.value })} disabled={submitting} />
                      </div>
                      <div className="grid gap-2">
                        <Label>E-mail *</Label>
                        <Input type="email" value={c.email} onChange={(e)=>setContato(idx, { email: e.target.value })} disabled={submitting} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Telefone</Label>
                        <Input value={c.telefone} onChange={(e)=>setContato(idx, { telefone: e.target.value })} disabled={submitting} />
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" onClick={()=>rmContato(idx)} disabled={submitting}>Remover</Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addContato} disabled={submitting}>Adicionar contato</Button>
                </div>
              )}
            </div>
          )}

          {/* 3 - Revisão */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium mb-1">Cliente</p>
                <Separator className="mb-2" />
                <dl className="grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Nome</dt><dd>{nome || "—"}</dd>
                  <dt className="text-muted-foreground">E-mail</dt><dd>{email || "—"}</dd>
                  <dt className="text-muted-foreground">Telefone</dt><dd>{telefone || "—"}</dd>
                  <dt className="text-muted-foreground">Avatar</dt><dd>{avatarFile ? `${avatarFile.name} (arquivo)` : (avatarUrl || "—")}</dd>
                  <dt className="text-muted-foreground">Ativo</dt><dd>{ativo ? "Sim" : "Não"}</dd>
                </dl>
              </div>

              {criarProjeto && (
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium mb-1">Projeto inicial</p>
                  <Separator className="mb-2" />
                  <dl className="grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Nome</dt><dd>{proj.nome || "—"}</dd>
                    <dt className="text-muted-foreground">Prazo</dt><dd>{proj.prazo || "—"}</dd>
                    <dt className="text-muted-foreground">Orçamento</dt><dd>{proj.orcamento || "—"}</dd>
                  </dl>
                </div>
              )}

              {addContatos && (
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium mb-1">Contatos</p>
                  <Separator className="mb-2" />
                  {contatos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum contato adicionado.</p>
                  ) : (
                    <ul className="text-sm list-disc pl-5">
                      {contatos.map((c, i) => (
                        <li key={i}>{c.nome} — {c.email}{c.telefone ? ` • ${c.telefone}` : ""}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="flex items-center justify-end gap-2">
            {!isFirst && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                Voltar
              </Button>
            )}
            {!isLast ? (
              <Button type="button" onClick={handleNext} disabled={submitting}>
                Avançar
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Concluir"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
