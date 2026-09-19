"use client";

import { useEffect, useMemo, useState } from "react";
import Thumb from "@/components/layout/Thumb";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getArteQuickPeek, type ArteQuickPeek } from "@/lib/projects";

/*
 * O tipo vem de quem busca os dados.
 *
 * Havia uma cópia local do formato aqui, e o `as unknown as PeekData` no
 * fetch calava a diferença entre ela e o que `getArteQuickPeek` devolvia de
 * verdade. Era esse cast que deixava a tela dizer "Sem preview disponível" e
 * "Sem feedbacks" sem ninguém notar: o compilador tinha como saber, e foi
 * mandado não olhar.
 */
type PeekData = ArteQuickPeek;

export default function ArteQuickPeekDrawer({
  open,
  onOpenChange,
  arteId,
  onNovaVersao,
  onSolicitarAprovacao,
  onVerFeedbacks,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  arteId?: string | null;
  onNovaVersao?: (arteId: string) => void;
  onSolicitarAprovacao?: (arteId: string) => void;
  onVerFeedbacks?: (arteId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [peek, setPeek] = useState<PeekData | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !arteId) return;
      setLoading(true);
      try {
        const data = await getArteQuickPeek(arteId);
        if (!mounted) return;
        setPeek(data);
      } catch (e) {
        console.error("Erro ao carregar quick peek:", e);
        if (mounted) setPeek(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, arteId]);

  const last = useMemo(() => peek?.versoes?.[0] ?? null, [peek]); // assumindo primeira é a mais recente

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            {peek?.arte?.nome ?? "Arte"}
            {peek?.arte?.status && (
              <Badge variant="outline" className="rounded-full">
                {peek.arte.status}
              </Badge>
            )}
          </DrawerTitle>
          {peek?.arte?.tipo && (
            <DrawerDescription>{peek.arte.tipo} • {peek.arte.autor?.nome ?? "—"} • {peek.arte?.criado_em ? new Date(peek.arte.criado_em).toLocaleDateString("pt-BR") : ""}</DrawerDescription>
          )}
        </DrawerHeader>

        <div className="px-6 pb-6 grid gap-6 md:grid-cols-2">
          {/* Preview grande */}
          <div className="relative rounded-xl border overflow-hidden min-h-[280px] bg-muted">
            {loading ? (
              <div className="h-full grid place-items-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando…
              </div>
            ) : last?.preview_url ? (
              /*
                `Thumb` e não `<Image>` cru.
                
                O `next/image` ESTOURA quando o host da URL não está em
                `remotePatterns` — e derruba a tela inteira, não só a imagem.
                Enquanto `preview_url` vinha sempre vazio isso nunca aconteceu;
                bastou o campo passar a ser preenchido para o drawer matar a
                página. `Thumb` usa `unoptimized`, que pula essa checagem, e
                troca a falha por um ícone: é o que o resto do produto já faz.
              */
              <Thumb
                src={last.preview_url}
                alt={peek?.arte?.nome ?? "preview"}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
              />
            ) : (
              <div className="h-full grid place-items-center text-xs text-muted-foreground">
                Sem preview disponível
              </div>
            )}
          </div>

          {/* Lado direito: versões + feedbacks */}
          <div className="space-y-4">
            {/* Versões */}
            <div>
              <div className="text-sm font-medium mb-2">Versões</div>
              <ScrollArea className="h-40 rounded-md border">
                <ul className="p-2 space-y-2">
                  {peek?.versoes?.map((v) => (
                    <li key={v.id} className={cn("rounded-md p-2 border flex items-center gap-3")}>
                      <div className="text-xs w-8 shrink-0 text-center font-medium">v{v.versao}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs">{v.status}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(v.criado_em).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      {v.preview_url ? (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                          <Thumb src={v.preview_url} alt={`v${v.versao}`} sizes="40px" iconClassName="h-3 w-3" />
                        </div>
                      ) : null}
                    </li>
                  ))}
                  {!peek?.versoes?.length && (
                    <li className="text-xs text-muted-foreground p-2">Sem versões</li>
                  )}
                </ul>
              </ScrollArea>
            </div>

            <Separator />

            {/* Feedbacks */}
            <div>
              <div className="text-sm font-medium mb-2">Feedbacks recentes</div>
              <ScrollArea className="h-32 rounded-md border">
                <ul className="p-2 space-y-2">
                  {peek?.feedbacks?.map((f) => (
                    <li key={f.id} className="rounded-md p-2 border">
                      <div className="text-xs font-medium">{f.autor.nome}</div>
                      <div className="text-xs text-muted-foreground">{new Date(f.criado_em).toLocaleString("pt-BR")}</div>
                      <div className="text-sm mt-1 line-clamp-2">{f.conteudo}</div>
                    </li>
                  ))}
                  {!peek?.feedbacks?.length && (
                    <li className="text-xs text-muted-foreground p-2">Sem feedbacks</li>
                  )}
                </ul>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DrawerFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Dica: você pode enviar esta versão para aprovação diretamente daqui.
          </div>
          <div className="flex gap-2">
            {arteId && onVerFeedbacks && (
              <Button variant="outline" onClick={() => onVerFeedbacks(arteId)}>Ver feedbacks</Button>
            )}
            {arteId && onNovaVersao && (
              <Button variant="outline" onClick={() => onNovaVersao(arteId)}>Nova versão</Button>
            )}
            {arteId && onSolicitarAprovacao && (
              <Button onClick={() => onSolicitarAprovacao(arteId)}>Solicitar aprovação</Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
