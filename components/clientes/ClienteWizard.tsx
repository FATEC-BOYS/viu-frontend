"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserRound } from "lucide-react";
import { api } from "@/lib/api";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: (clienteId: string) => void };

/** Cadastro de contato: projetos são criados no fluxo de projetos. */
export default function ClienteWizard({ open, onOpenChange, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const enviando = useRef(false);
  useEffect(() => {
    if (open) { setNome(""); setEmail(""); setTelefone(""); setErro(null); }
  }, [open]);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (enviando.current) return;
    if (nome.trim().length < 2) { setErro("Informe o nome do cliente com pelo menos 2 caracteres."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro("Informe um e-mail válido."); return; }
    enviando.current = true; setSalvando(true); setErro(null);
    try {
      const resposta = await api.post<{ data: { id: string } }>("/clientes", {
        nome: nome.trim(), email: email.trim().toLowerCase(), telefone: telefone.trim() || undefined,
      });
      if (!resposta.data?.id) throw new Error("Não foi possível confirmar o cadastro. Tente novamente.");
      onCreated?.(resposta.data.id);
      onOpenChange(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar. Seus dados continuam aqui.");
    } finally { enviando.current = false; setSalvando(false); }
  }

  return <Dialog open={open} onOpenChange={value => { if (!enviando.current) onOpenChange(value); }}>
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-border/60 bg-background p-0 shadow-2xl" onEscapeKeyDown={e => { if (enviando.current) e.preventDefault(); }} onInteractOutside={e => { if (enviando.current) e.preventDefault(); }}>
      <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-5 pt-6 text-left">
        <div className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="size-5" /></div>
        <DialogTitle className="pr-8 text-2xl tracking-tight">Novo cliente</DialogTitle>
        <DialogDescription className="leading-relaxed">Salve o contato na sua carteira. Você pode criar ou associar um projeto depois.</DialogDescription>
      </DialogHeader>
      <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-6">
          <div className="space-y-2"><Label htmlFor="cliente-nome">Nome do cliente</Label><Input id="cliente-nome" autoComplete="name" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Marina Costa ou Café Aurora" required minLength={2} maxLength={100} disabled={salvando} /></div>
          <div className="space-y-2"><Label htmlFor="cliente-email">E-mail</Label><Input id="cliente-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@empresa.com.br" required disabled={salvando} /><p className="text-xs leading-relaxed text-muted-foreground">Use o e-mail que a pessoa vai usar no VIU. Se ela já tiver conta, o cadastro será aproveitado.</p></div>
          <div className="space-y-2"><Label htmlFor="cliente-telefone">Telefone <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="cliente-telefone" type="tel" autoComplete="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" disabled={salvando} /></div>
          {erro && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{erro}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="mr-2 size-4 animate-spin" />}{salvando ? "Salvando…" : "Salvar cliente"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
