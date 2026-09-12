'use client';

import { FadeIn } from '@/components/layout/Motion';
import EmptyState from '@/components/layout/EmptyState';
import { useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EnviarLinkDialog from '@/components/compartilhar/EnviarLinkDialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Copy, ExternalLink, Link2, Loader2, MoreHorizontal, Search, Trash2, Ban,
  CalendarPlus, Infinity as InfinityIcon,
} from 'lucide-react';

/**
 * Quem abriu, quem ainda não abriu, e o que já não vale mais.
 *
 * `LinkCompartilhado` tem dez campos. A tela antiga mostrava quatro, inventava
 * dois que não existem em lugar nenhum do schema — "Pode comentar" e "Pode
 * baixar", ambos com o `onChange` vazio — e ignorava os três que decidem se o
 * link serve para alguma coisa:
 *
 *   revogado          um link revogado aparecia como "Permanente ✓", e o
 *                     designer copiava e mandava ao cliente um 404
 *   acessos           a única prova de que o link chegou do outro lado
 *   limiteTentativas  um quarto jeito de o link morrer, invisível na tela
 *
 * Havia também dois interruptores para o mesmo campo. No banco,
 * `somenteLeitura = true` significa que o cliente NÃO pode comentar — é o que
 * `linkService.resolveArteIdFromToken` recusa. A tela oferecia "Somente
 * leitura" (que funcionava) e "Pode comentar" (que não fazia nada), e dava
 * para ligar os dois ao mesmo tempo. Sobrou um: o que o cliente pode fazer.
 *
 * E metade da tela era para um tipo que não existe: `createSharedLink` grava
 * `tipo: 'ARTE'` fixo, mas havia filtro de Projeto, pílula de Projeto,
 * ordenação por tipo e um campo `projeto` que o mapper preenchia com `null`.
 *
 * O agrupamento carrega o que os filtros faziam à mão. Esperando abrir é a
 * faixa que pede ação — é ela que responde "mandei e sumiu?".
 *
 * Sobre a linha não ser clicável: não existe rota de arte individual no app
 * (`/artes` é só a lista). Um link que não leva a lugar nenhum é pior do que
 * nenhum; as ações à direita são o que esta tela tem para oferecer.
 */

import {
  PINO,
  TITULO,
  agrupar,
  avisoDeValidade,
  estadoDoLink,
  recadoDosLinks,
  type Faixa,
  type LinkCompartilhado,
} from '@/lib/links';

/* ===================== Linha ===================== */

function LinhaLink({
  link,
  faixa,
  rotulo,
  aoCopiar,
  aoAlternarComentario,
  aoEstender,
  aoTornarPermanente,
  aoRevogar,
  aoExcluir,
}: {
  link: LinkCompartilhado;
  faixa: Faixa;
  rotulo: string;
  aoCopiar: (url: string) => void;
  aoAlternarComentario: (id: string, podeComentar: boolean) => void;
  aoEstender: (id: string, dias: number) => void;
  aoTornarPermanente: (id: string) => void;
  aoRevogar: (id: string) => void;
  aoExcluir: (id: string) => void;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/l/${link.token}`;
  const morto = faixa === 'morto';

  const titulo = link.arte?.nome ?? 'Arte removida';
  const projeto = link.arte?.projeto.nome ?? '';
  const cliente = link.arte?.projeto.cliente.nome ?? '';
  const apoio = [projeto, cliente].filter(Boolean).join(' · ');
  const aviso = avisoDeValidade(link);

  return (
    <li className="border-b last:border-b-0">
      <div className={`flex items-stretch gap-3 py-2.5 ${morto ? 'opacity-60' : ''}`}>
        <span aria-hidden className={`w-[3px] shrink-0 rounded-full ${PINO[faixa]}`} />

        {/*
          Mesmo arranjo da agenda de Prazos: com `flex-wrap` e base de 13rem,
          no desktop o estado fica à direita e no celular ele desce para a
          própria linha, em vez de espremer o nome da arte até o reticências.
        */}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
          <div className="min-w-0 flex-1 basis-52">
            <p className="truncate text-sm font-medium">{titulo}</p>
            {apoio && <p className="truncate text-xs text-muted-foreground">{apoio}</p>}
          </div>
          <p className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {rotulo}
            {aviso && <span className="text-foreground"> · {aviso}</span>}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-1">
          {!morto && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => aoCopiar(url)}
              aria-label={`Copiar link de ${titulo}`}
            >
              <Copy className="size-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Ações do link de ${titulo}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!morto && (
                <>
                  <DropdownMenuItem onClick={() => window.open(url, '_blank', 'noopener')}>
                    <ExternalLink className="mr-2 size-4" />
                    Abrir como o cliente vê
                  </DropdownMenuItem>

                  {/*
                    Um interruptor só, e com o nome do que o cliente ganha.
                    `somenteLeitura` é o campo, e ele é o avesso disto.
                  */}
                  <DropdownMenuCheckboxItem
                    checked={!link.somenteLeitura}
                    onCheckedChange={(v) => aoAlternarComentario(link.id, v)}
                  >
                    Cliente pode comentar
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />
                </>
              )}

              {!link.revogado && (
                <>
                  <DropdownMenuItem onClick={() => aoEstender(link.id, 7)}>
                    <CalendarPlus className="mr-2 size-4" />
                    Adiar 7 dias
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => aoEstender(link.id, 30)}>
                    <CalendarPlus className="mr-2 size-4" />
                    Adiar 30 dias
                  </DropdownMenuItem>
                  {link.expiraEm && (
                    <DropdownMenuItem onClick={() => aoTornarPermanente(link.id)}>
                      <InfinityIcon className="mr-2 size-4" />
                      Tirar a validade
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {/*
                    Revogar mata o link e mantém o registro — o histórico de
                    acessos continua contando a história. Excluir apaga os dois.
                  */}
                  <DropdownMenuItem onClick={() => aoRevogar(link.id)}>
                    <Ban className="mr-2 size-4" />
                    Revogar
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuItem
                onClick={() => aoExcluir(link.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* O envio fica fora do menu porque é o que se faz com um link que
          ninguém abriu ainda — esconder num "…" é enterrar a ação principal. */}
      {faixa === 'esperando' && (
        <div className="pb-2.5 pl-[15px]">
          <EnviarLinkDialog
            token={link.token}
            reviewUrl={url}
            projectName={projeto || titulo}
            clientName={cliente || null}
            clientPhone={link.arte?.projeto.cliente.telefone ?? null}
          />
        </div>
      )}
    </li>
  );
}

/* ===================== Página ===================== */

export default function LinksPage() {
  const [links, setLinks] = useState<LinkCompartilhado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await api.get<{ data: unknown[] }>('/links');
        if (!vivo) return;
        // Os nomes vêm do Prisma em camelCase; não há segunda convenção a
        // acomodar, e o `?? snake_case` de antes só escondia isso.
        setLinks(((res.data ?? []) as LinkCompartilhado[]).map((r) => ({
          ...r,
          acessos: r.acessos ?? 0,
          revogado: Boolean(r.revogado),
          somenteLeitura: Boolean(r.somenteLeitura),
          limiteTentativas: r.limiteTentativas ?? null,
        })));
      } catch {
        if (vivo) setErro('Não foi possível carregar os links.');
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return links;
    return links.filter((l) => {
      const campos = [
        l.arte?.nome,
        l.arte?.projeto.nome,
        l.arte?.projeto.cliente.nome,
        l.token,
      ];
      return campos.some((c) => c?.toLowerCase().includes(q));
    });
  }, [links, busca]);

  const grupos = useMemo(() => agrupar(visiveis), [visiveis]);

  /* ===== Ações ===== */

  const remendar = (id: string, patch: Partial<LinkCompartilhado>) =>
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  async function aoCopiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  }

  async function aoAlternarComentario(id: string, podeComentar: boolean) {
    const antes = links.find((l) => l.id === id)?.somenteLeitura ?? true;
    remendar(id, { somenteLeitura: !podeComentar });
    try {
      await api.put(`/links/${id}`, { somenteLeitura: !podeComentar });
    } catch {
      remendar(id, { somenteLeitura: antes });
      toast.error('Não foi possível mudar a permissão.');
    }
  }

  async function aoEstender(id: string, dias: number) {
    const item = links.find((l) => l.id === id);
    if (!item) return;
    // Adiar a partir de hoje quando o link já venceu: somar sobre uma data
    // passada devolveria um prazo que nasce vencido.
    const agora = Date.now();
    const base = item.expiraEm ? Math.max(new Date(item.expiraEm).getTime(), agora) : agora;
    const novo = new Date(base + dias * 86400000).toISOString();
    remendar(id, { expiraEm: novo });
    try {
      await api.put(`/links/${id}`, { expiraEm: novo });
    } catch {
      remendar(id, { expiraEm: item.expiraEm });
      toast.error('Não foi possível adiar a validade.');
    }
  }

  async function aoTornarPermanente(id: string) {
    const antes = links.find((l) => l.id === id)?.expiraEm ?? null;
    remendar(id, { expiraEm: null });
    try {
      await api.put(`/links/${id}`, { expiraEm: null });
    } catch {
      remendar(id, { expiraEm: antes });
      toast.error('Não foi possível tirar a validade.');
    }
  }

  async function aoRevogar(id: string) {
    remendar(id, { revogado: true });
    try {
      await api.put(`/links/${id}/revogar`, {});
      toast.success('Link revogado. Quem tiver o endereço não abre mais.');
    } catch {
      remendar(id, { revogado: false });
      toast.error('Não foi possível revogar o link.');
    }
  }

  async function aoExcluir(id: string) {
    const antes = links;
    setLinks((prev) => prev.filter((l) => l.id !== id));
    try {
      await api.delete(`/links/${id}`);
    } catch {
      setLinks(antes);
      toast.error('Não foi possível excluir o link.');
    }
  }

  /* ===== Render ===== */

  if (carregando) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <span className="sr-only">Carregando links…</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">{erro}</p>
        <Button onClick={() => location.reload()}>Recarregar</Button>
      </div>
    );
  }

  return (
    <FadeIn className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Links compartilhados ✦</h1>
        <p className="mt-1 text-sm text-muted-foreground">{recadoDosLinks(links)}</p>
      </div>

      {links.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por arte, projeto, cliente ou token…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {links.length === 0 ? (
        <EmptyState
          icon={Link2}
          tom="pessego"
          title="Nenhum link ainda"
          description="O link de revisão nasce no envio da arte. Assim que você mandar o primeiro, ele aparece aqui — e esta tela passa a dizer quem abriu."
          acaoSecundaria={{ label: 'Ir para Artes', href: '/artes' }}
        />
      ) : grupos.length === 0 ? (
        <EmptyState
          variante="filtro"
          title="Nada com esse termo"
          description="A busca olha o nome da arte, do projeto, do cliente e o token."
          actionLabel="Limpar busca"
          onAction={() => setBusca('')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map((grupo) => (
            <section key={grupo.faixa} className="flex flex-col gap-1 rounded-xl border bg-card p-4">
              <h2 className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
                <span>{TITULO[grupo.faixa]}</span>
                <span className="tabular-nums">{grupo.itens.length}</span>
              </h2>

              <ul className="flex flex-col">
                {grupo.itens.map((link) => (
                  <LinhaLink
                    key={link.id}
                    link={link}
                    faixa={grupo.faixa}
                    rotulo={estadoDoLink(link).rotulo}
                    aoCopiar={aoCopiar}
                    aoAlternarComentario={aoAlternarComentario}
                    aoEstender={aoEstender}
                    aoTornarPermanente={aoTornarPermanente}
                    aoRevogar={aoRevogar}
                    aoExcluir={aoExcluir}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* O link nasce no passo 3 do wizard de envio da arte — não aqui. O rodapé
          diz onde ele nasce em vez de um botão prometendo uma tela que não há. */}
      {links.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Links novos nascem ao enviar uma arte.{' '}
          <NextLink href="/artes" className="underline underline-offset-2 hover:text-foreground">
            Ir para Artes
          </NextLink>
        </p>
      )}
    </FadeIn>
  );
}
