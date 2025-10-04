"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, UserMinus, Crown, ShieldCheck } from "lucide-react";

type Papel = "OWNER" | "DESIGNER" | "CLIENTE" | "APROVADOR" | "OBSERVADOR";

type ParticipanteRow = {
  id: string;
  usuario_id: string;
  nome: string;
  email?: string | null;
  avatar?: string | null;
  papel: Papel;
};

type ConviteRow = {
  id: string;
  email: string;
  papel: Papel;
  status: "PENDENTE" | "ACEITO" | "CANCELADO" | "EXPIRADO";
  criado_em: string;
};

type ContactResult = { id?: string; email: string; nome?: string | null; avatar?: string | null };

export default function GerenciarAcessosDrawer({
  open,
  onOpenChange,
  projetoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projetoId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [participantes, setParticipantes] = useState<ParticipanteRow[]>([]);
  const [convites, setConvites] = useState<ConviteRow[]>([]);

  // form: adicionar
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("CLIENTE");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ContactResult[]>([]);
  const [selected, setSelected] = useState<ContactResult | null>(null);

  const owner = useMemo(
    () => participantes.find((p) => p.papel === "OWNER"),
    [participantes]
  );

  async function loadAll() {
    setLoading(true);
    try {
      // participantes
      const p = await fetch(`/api/projetos/${projetoId}/participantes`).then((r) => r.json());
      // convites
      const c = await fetch(`/api/projetos/${projetoId}/convites`).then((r) => r.json());
      setParticipantes(p?.items ?? []);
      setConvites(c?.items ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar acessos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projetoId]);

  // busca segura por e-mail (sem listar a plataforma inteira)
  const doSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(q)}`).then((r) => r.json());
      setResults(Array.isArray(res?.items) ? res.items : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // adicionar participante/convite
  const handleAdd = useCallback(async () => {
    const mail = (selected?.email || email).trim().toLowerCase();
    if (!mail) return;

    setSaving(true);
    try {
      // resolve: tenta achar/registrar contato pelo e-mail (retorna usuario_id|null)
      const resolved = await fetch("/api/contacts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail }),
      }).then((r) => r.json());

      if (resolved?.usuario_id) {
        // já é usuário -> vira participante direto
        await fetch(`/api/projetos/${projetoId}/participantes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: resolved.usuario_id, papel }),
        }).then((r) => {
          if (!r.ok) throw new Error("Falha ao adicionar participante");
        });
        toast.success("Participante adicionado!");
      } else {
        // envia convite
        await fetch(`/api/projetos/${projetoId}/convites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: mail, papel }),
        }).then((r) => {
          if (!r.ok) throw new Error("Falha ao enviar convite");
        });
        toast.success("Convite enviado!");
      }

      setEmail("");
      setSelected(null);
      setResults([]);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível adicionar");
    } finally {
      setSaving(false);
    }
  }, [email, papel, projetoId, selected]);

  // alterar papel de um participante (promover/rebaixar)
  const changeRole = useCallback(
    async (participanteId: string, novo: Papel) => {
      try {
        await fetch(`/api/projetos/${projetoId}/participantes/${participanteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ papel: novo }),
        }).then((r) => {
          if (!r.ok) throw new Error("Falha ao alterar papel");
        });
        toast.success("Papel atualizado!");
        await loadAll();
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao alterar papel");
      }
    },
    [projetoId]
  );

  // remover participante
  const removePart = useCallback(
    async (participanteId: string) => {
      try {
        await fetch(`/api/projetos/${projetoId}/participantes/${participanteId}`, {
          method: "DELETE",
        }).then((r) => {
          if (!r.ok) throw new Error("Falha ao remover");
        });
        toast.success("Removido.");
        await loadAll();
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao remover");
      }
    },
    [projetoId]
  );

  // cancelar convite
  const cancelInvite = useCallback(
    async (conviteId: string) => {
      try {
        await fetch(`/api/projetos/${projetoId}/convites/${conviteId}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error("Falha ao cancelar convite");
        });
        toast.success("Convite cancelado.");
        await loadAll();
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao cancelar");
      }
    },
    [projetoId]
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="w-[420px] max-w-[95vw]">
        <DrawerHeader>
          <DrawerTitle>Gerenciar acessos</DrawerTitle>
          <DrawerDescription>Adicione, remova e ajuste papéis neste projeto.</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Owner fixo */}
          {owner && (
            <div className="rounded-lg border p-3 flex items-center gap-3 bg-muted/30">
              <Crown className="h-4 w-4 text-yellow-600" />
              <Avatar className="h-7 w-7">
                {owner.avatar ? <AvatarImage src={owner.avatar} alt={owner.nome} /> : <AvatarFallback>{owner.nome.slice(0,2).toUpperCase()}</AvatarFallback>}
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{owner.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{owner.email ?? "—"}</div>
              </div>
              <Badge variant="outline" className="rounded-full ml-auto">OWNER</Badge>
            </div>
          )}

          {/* Adicionar por e-mail */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Adicionar pessoa</div>
            <div className="flex gap-2">
              <Input
                placeholder="nome@dominio.com"
                value={selected?.email ?? email}
                onChange={(e) => { setSelected(null); setEmail(e.target.value); if (e.target.value.includes("@")) doSearch(e.target.value); }}
                onBlur={() => {
                  if (!email && !selected) return;
                  if ((email || selected?.email)?.includes("@")) doSearch(email || selected?.email || "");
                }}
              />
              <Select value={papel} onValueChange={(v: Papel) => setPapel(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESIGNER">Designer</SelectItem>
                  <SelectItem value="CLIENTE">Cliente</SelectItem>
                  <SelectItem value="APROVADOR">Aprovador</SelectItem>
                  <SelectItem value="OBSERVADOR">Observador</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={saving || (!email && !selected)}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>

            {/* resultados (se houver) */}
            {searching ? (
              <div className="text-xs text-muted-foreground">Buscando…</div>
            ) : results.length > 0 ? (
              <ul className="border rounded-md divide-y">
                {results.map((r, i) => (
                  <li key={i} className="p-2 flex items-center gap-2 cursor-pointer hover:bg-muted"
                      onClick={() => { setSelected(r); setEmail(""); }}>
                    <Avatar className="h-6 w-6">
                      {r.avatar ? <AvatarImage src={r.avatar} alt={r.email} /> : <AvatarFallback className="text-[10px]">{(r.nome ?? r.email).slice(0,2).toUpperCase()}</AvatarFallback>}
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.nome ?? r.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                    </div>
                    <Badge variant="outline" className="rounded-full ml-auto">{r.id ? "na plataforma" : "novo contato"}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Separator />

          {/* Lista de participantes (editável) */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Participantes</div>
            <ul className="grid gap-2">
              {participantes
                .filter((p) => p.papel !== "OWNER")
                .map((p) => (
                <li key={p.id} className="rounded-lg border p-2 flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {p.avatar ? <AvatarImage src={p.avatar} alt={p.nome} /> : <AvatarFallback>{p.nome.slice(0,2).toUpperCase()}</AvatarFallback>}
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.email ?? "—"}</div>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Select value={p.papel} onValueChange={(v: Papel) => changeRole(p.id, v)}>
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DESIGNER">Designer</SelectItem>
                        <SelectItem value="CLIENTE">Cliente</SelectItem>
                        <SelectItem value="APROVADOR">Aprovador</SelectItem>
                        <SelectItem value="OBSERVADOR">Observador</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button size="icon" variant="outline" onClick={() => removePart(p.id)} title="Remover">
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
              {participantes.filter((p) => p.papel !== "OWNER").length === 0 && (
                <li className="text-xs text-muted-foreground border rounded-md p-3">
                  Sem participantes ainda.
                </li>
              )}
            </ul>
          </div>

          {/* Convites pendentes */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Convites</div>
            <ul className="grid gap-2">
              {convites.map((c) => (
                <li key={c.id} className="rounded-lg border p-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.papel.toLowerCase()} • {c.status.toLowerCase()} • {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="ml-auto">
                    {c.status === "PENDENTE" && (
                      <Button size="sm" variant="outline" onClick={() => cancelInvite(c.id)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
              {convites.length === 0 && (
                <li className="text-xs text-muted-foreground border rounded-md p-3">
                  Sem convites por aqui.
                </li>
              )}
            </ul>
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
