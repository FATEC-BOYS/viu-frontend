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
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
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
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 40);
}

const steps = [
  { id: 0, title: "Cliente", desc: "Dados básicos do cliente" },
  { id: 1, title: "Projeto (opcional)", desc: "Configure um projeto inicial" },
  { id: 2, title: "Contatos (opcional)", desc: "Adicione pessoas de contato" },
  { id: 3, title: "Revisão", desc: "Confirme e crie" },
] as const;

export default function ClienteWizard({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
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

  // Step 2 — Contatos (opcional — sem endpoint dedicado no backend)
  const [addContatos, setAddContatos] = useState(false);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const addContato = () => setContatos((prev) => [...prev, { nome: "", email: "", telefone: "" }]);
  const rmContato = (i: number) => setContatos((prev) => prev.filter((_, idx) => idx !== i));
  const setContato = (i: number, patch: Partial<Contato>) =>
    setContatos((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

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

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;

    try {
      setSubmitting(true);

      // 1) Cria o usuário cliente via REST API
      // Gera senha temporária — o cliente pode redefinir via "esqueci minha senha"
      const tempPassword = `Viu@${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const clienteRes = await api.post<{ data: { id: string } }>('/usuarios', {
        nome: nome.trim(),
        email: email.trim(),
        senha: tempPassword,
        telefone: telefone || undefined,
        tipo: "CLIENTE",
      });
      const clienteId = clienteRes.data?.id;
      if (!clienteId) throw new Error("Não retornou id do cliente.");

      // 2) Upload de avatar (se arquivo selecionado)
      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append("file", avatarFile);
          const token = typeof window !== "undefined" ? localStorage.getItem("viu_token") : null;
          const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
          await fetch(`${BASE_URL}/usuarios/${clienteId}/avatar`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
        } catch {
          // avatar falhou mas o cliente foi criado — segue
        }
      }

      // 3) Projeto opcional
      if (criarProjeto && proj.nome.trim()) {
        const orcCents = centsFromBRLString(proj.orcamento);
        const prazoISO = proj.prazo ? new Date(proj.prazo).toISOString() : null;
        await api.post('/projetos', {
          nome: proj.nome.trim(),
          descricao: null,
          status: "EM_ANDAMENTO",
          orcamento: orcCents || undefined,
          prazo: prazoISO,
          clienteId,
        });
      }

      // 4) Contatos opcionais — sem endpoint dedicado no backend ainda
      // TODO: implementar endpoint POST /contatos quando disponível no backend

      toast.success("Cliente criado com sucesso!");
      onCreated?.(clienteId);
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível concluir o cadastro.");
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
