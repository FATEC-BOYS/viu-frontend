"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import AsyncUserSingleSelect from "@/components/projetos/AsyncUserSingleSelect";
import { toast } from "sonner";
import { Loader2, MailPlus, ShieldCheck } from "lucide-react";
import {
  convitesApi,
  formatConviteStatus,
  formatExpiracao,
  type ConviteDoProjeto,
} from "@/lib/convites";
import { getProjeto, type Projeto } from "@/lib/projects";
import { iniciais } from "@/lib/iniciais";

/**
 * Pessoas com acesso a um projeto.
 *
 * O modelo do backend é enxuto de propósito: um projeto tem exatamente um
 * designer e um cliente (`Projeto.designerId` / `clienteId`), e o acesso da
 * outra parte nasce de um convite aceito. Não existem papéis por projeto nem
 * lista de participantes arbitrária — por isso aqui não há troca de papel nem
 * remoção: o que existe é convidar, e acompanhar o convite.
 *
 * Convite só pode ser criado enquanto o projeto está em RASCUNHO; o aceite é o
 * que move o projeto para EM_ANDAMENTO.
 */
export default function GerenciarAcessosDrawer({
  open,
  onOpenChange,
  projetoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projetoId: string;
}) {
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [convites, setConvites] = useState<ConviteDoProjeto[]>([]);
  const [convidadoId, setConvidadoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [resProjeto, resConvites] = await Promise.allSettled([
        getProjeto(projetoId),
        convitesApi.listarDoProjeto(projetoId),
      ]);
      if (resProjeto.status === "fulfilled") setProjeto(resProjeto.value);
      if (resConvites.status === "fulfilled") setConvites(resConvites.value);
      if (resProjeto.status === "rejected") {
        toast.error("Não foi possível carregar os acessos do projeto");
      }
    } finally {
      setCarregando(false);
    }
  }, [projetoId]);

  useEffect(() => {
    if (open) carregar();
  }, [open, carregar]);

  const podeConvidar = projeto?.status === "RASCUNHO";

  const convidar = useCallback(async () => {
    if (!convidadoId) return;
    setEnviando(true);
    try {
      await convitesApi.convidar(projetoId, convidadoId);
      toast.success("Convite enviado! A pessoa recebe um e-mail com o link de aceite.");
      setConvidadoId(null);
      await carregar();
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Não foi possível enviar o convite");
    } finally {
      setEnviando(false);
    }
  }, [carregar, convidadoId, projetoId]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="w-[420px] max-w-[95vw]">
        <DrawerHeader>
          <DrawerTitle>Pessoas do projeto</DrawerTitle>
          <DrawerDescription>
            Quem já tem acesso e quais convites estão em aberto.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 px-6 pb-6">
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Carregando…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-xs font-medium">Com acesso</div>
                <PessoaLinha
                  nome={projeto?.designer?.nome ?? "—"}
                  papel="Designer"
                />
                <PessoaLinha
                  nome={projeto?.cliente?.nome ?? "—"}
                  papel="Cliente"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="convidar-pessoa" className="text-xs font-medium">
                  Convidar cliente
                </Label>
                <AsyncUserSingleSelect
                  tipo="CLIENTE"
                  value={convidadoId}
                  onChange={setConvidadoId}
                  route="/api/contacts/search"
                  placeholder="Buscar por nome ou e-mail"
                />
                <Button
                  id="convidar-pessoa"
                  className="w-full"
                  onClick={convidar}
                  disabled={!convidadoId || enviando || !podeConvidar}
                >
                  {enviando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <MailPlus className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Enviar convite
                </Button>
                {!podeConvidar && (
                  <p className="text-xs text-muted-foreground">
                    Convites só podem ser enviados enquanto o projeto está em rascunho — é o
                    aceite que coloca o projeto em andamento.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium">Convites</div>
                <ul className="grid gap-2">
                  {convites.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-lg border p-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {c.convidado?.nome ?? c.convidado?.email ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatConviteStatus(c.status)}
                          {c.status === "PENDENTE" && ` • ${formatExpiracao(c.expiraEm)}`}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-auto rounded-full text-xs">
                        {new Date(c.criadoEm).toLocaleDateString("pt-BR")}
                      </Badge>
                    </li>
                  ))}
                  {convites.length === 0 && (
                    <li className="rounded-md border p-3 text-xs text-muted-foreground">
                      Nenhum convite enviado neste projeto.
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
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

function PessoaLinha({ nome, papel }: { nome: string; papel: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={undefined} alt="" />
        <AvatarFallback>{iniciais(nome)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 truncate text-sm font-medium">{nome}</div>
      <Badge variant="outline" className="ml-auto rounded-full">
        {papel}
      </Badge>
    </div>
  );
}
