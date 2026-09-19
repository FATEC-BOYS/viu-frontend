'use client';

/*
 * A caixa de entrada do VIU.
 *
 * Esta tela dizia coisas que o servidor nunca confirmou. Os filtros de tipo
 * vinham de uma lista escrita à mão, copiada de um enum que o sistema havia
 * parado de falar: dos seis tipos oferecidos, quatro nenhum serviço emitia —
 * clicar neles só sabia devolver "sem notificações" — e dez tipos que existiam
 * de fato não tinham rótulo, então a notificação mais importante do produto
 * aparecia escrita `APROVACAO_SOLICITADA`. O seed sustentava a ilusão porque
 * semeava justamente o vocabulário da lista.
 *
 * Agora tipo, rótulo e contagem vêm do servidor, e o filtro acontece lá: em
 * memória, sobre um `?limit=100` fixo, filtrar escondia o que houvesse além da
 * centésima linha sem avisar que estava escondendo.
 */

import { FadeIn } from "@/components/layout/Motion";
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ChipPopover, ChipOption } from '@/components/filtros/ChipDeFiltro';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

import {
  Bell, CheckCheck, Clock, FileText, ImageIcon, Loader2, MessageSquare,
  Receipt, Trash2, CheckCircle2, XCircle, CreditCard, UserMinus, ChevronRight,
} from 'lucide-react';

import {
  destinoDaNotificacao, excluirNotificacao, listFacetasDeNotificacoes,
  listNotificacoes, marcarComoLida, marcarTodasComoLidas,
  type FacetasDeNotificacoes, type Notificacao,
} from '@/lib/notificacoes';

/*
 * Só o ícone mora aqui — é decisão de apresentação. O nome do tipo vem do
 * servidor junto com o tipo, que é o que impede a lista de envelhecer sozinha.
 * Tipo sem entrada cai no sino, sem nada quebrar.
 */
const ICONE_POR_TIPO: Record<string, typeof Bell> = {
  APROVACAO_SOLICITADA: Clock,
  LEMBRETE_APROVACAO: Clock,
  ARTE_APROVADA: CheckCircle2,
  ARTE_REJEITADA: XCircle,
  NOVO_FEEDBACK: MessageSquare,
  FATURA_GERADA: Receipt,
  PAGAMENTO_CONFIRMADO: CreditCard,
  ESTORNO: Receipt,
  CLIENTE_RECUSOU_CADASTRO: UserMinus,
  ASSINATURA_RENOVADA: FileText,
  ASSINATURA_CANCELADA: FileText,
  ASSINATURA_PAUSADA: FileText,
  SISTEMA: Bell,
  NOVA_ARTE: ImageIcon,
};

function quando(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const horas = Math.floor((Date.now() - d.getTime()) / 3_600_000);
  if (horas < 1) return 'agora há pouco';
  if (horas < 24) return `${horas}h atrás`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `${dias}d atrás`;
  return d.toLocaleDateString('pt-BR');
}

const POR_PAGINA = [20, 50, 100];

function Notificacoes() {
  const router = useRouter();
  const params = useSearchParams();

  const tipo = params.get('tipo') ?? '';
  const canal = params.get('canal') ?? '';
  const statusParam = params.get('lida');
  const lida = statusParam === null ? undefined : statusParam === 'true';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const limit = Number(params.get('limit') ?? '20') || 20;

  const [itens, setItens] = useState<Notificacao[]>([]);
  const [total, setTotal] = useState(0);
  const [naoLidas, setNaoLidas] = useState(0);
  const [paginas, setPaginas] = useState(1);
  const [facetas, setFacetas] = useState<FacetasDeNotificacoes>({ tipos: [], canais: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aExcluir, setAExcluir] = useState<Notificacao | null>(null);

  const setParam = useCallback((chave: string, valor: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (valor === null || valor === '') p.delete(chave);
    else p.set(chave, valor);
    // Mudar de filtro volta para a primeira página; mudar de página, não.
    if (chave !== 'page') p.delete('page');
    router.replace(`/notificacoes${p.toString() ? `?${p}` : ''}`);
  }, [params, router]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [pagina, f] = await Promise.all([
        listNotificacoes({ tipo: tipo || undefined, canal: canal || undefined, lida, page, limit }),
        listFacetasDeNotificacoes(),
      ]);
      setItens(pagina.itens);
      setTotal(pagina.total);
      setNaoLidas(pagina.naoLidas);
      setPaginas(Math.max(1, pagina.paginas));
      setFacetas(f);
      setErro(null);
    } catch {
      setErro('Não foi possível carregar as notificações.');
    } finally {
      setCarregando(false);
    }
  }, [tipo, canal, lida, page, limit]);

  useEffect(() => { void carregar(); }, [carregar]);

  const rotuloDoTipo = useMemo(() => {
    const m = new Map(facetas.tipos.map((t) => [t.tipo, t.rotulo]));
    // Sem rótulo conhecido, o próprio valor: sumir seria pior que ficar feio.
    return (t: string) => m.get(t) ?? t;
  }, [facetas.tipos]);

  const temFiltro = Boolean(tipo || canal || lida !== undefined);

  async function alternarLida(n: Notificacao) {
    const proxima = !n.lida;
    setItens((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: proxima } : x)));
    setNaoLidas((v) => Math.max(0, v + (proxima ? -1 : 1)));
    try {
      await marcarComoLida(n.id, proxima);
    } catch {
      // Desfaz: deixar a linha marcada sem o servidor concordar é a mesma
      // mentira que esta tela tinha, só que mais difícil de perceber.
      setItens((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: n.lida } : x)));
      setNaoLidas((v) => Math.max(0, v + (proxima ? 1 : -1)));
    }
  }

  async function marcarTodas() {
    try {
      await marcarTodasComoLidas();
      await carregar();
    } catch {
      setErro('Não foi possível marcar todas como lidas.');
    }
  }

  async function confirmarExclusao() {
    const alvo = aExcluir;
    if (!alvo) return;
    setAExcluir(null);
    try {
      await excluirNotificacao(alvo.id);
      await carregar();
    } catch {
      setErro('Não foi possível excluir a notificação.');
    }
  }

  if (carregando && itens.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando notificações…</span>
      </div>
    );
  }

  return (
    <FadeIn className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
            <span className="text-sm text-muted-foreground">
              {/* O número do servidor, não o da página: contar as linhas
                  carregadas fazia a tela discordar do sino da lateral. */}
              {temFiltro
                ? `${total} ${total === 1 ? 'resultado' : 'resultados'}`
                : `${total} ${total === 1 ? 'notificação' : 'notificações'}`}
              {naoLidas > 0 && ` · ${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}`}
            </span>
          </div>
          {naoLidas > 0 && (
            <Button onClick={marcarTodas}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Tudo que aconteceu nos seus projetos — aprovações, feedbacks e cobranças.
        </p>
      </header>

      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Uma linha de chips. As opções vêm do servidor: existe porque há linha. */}
      <div className="flex flex-wrap items-center gap-2">
        <ChipPopover label="Tipo" valor={tipo ? rotuloDoTipo(tipo) : null}>
          <div className="grid">
            <ChipOption label="Todos os tipos" selected={!tipo} onClick={() => setParam('tipo', null)} />
            {facetas.tipos.map((t) => (
              <ChipOption
                key={t.tipo}
                label={`${t.rotulo} (${t.total})`}
                selected={tipo === t.tipo}
                onClick={() => setParam('tipo', t.tipo)}
              />
            ))}
          </div>
        </ChipPopover>

        <ChipPopover
          label="Status"
          valor={lida === undefined ? null : lida ? 'Lidas' : 'Não lidas'}
        >
          <div className="grid">
            <ChipOption label="Todas" selected={lida === undefined} onClick={() => setParam('lida', null)} />
            <ChipOption label="Não lidas" selected={lida === false} onClick={() => setParam('lida', 'false')} />
            <ChipOption label="Lidas" selected={lida === true} onClick={() => setParam('lida', 'true')} />
          </div>
        </ChipPopover>

        {/*
         * Canal só aparece quando há mais de um. Hoje o sistema só entrega
         * dentro do app, então o filtro antigo tinha duas opções que não
         * casavam com nada e um selo "Sistema" repetido em toda linha.
         */}
        {facetas.canais.length > 1 && (
          <ChipPopover label="Canal" valor={canal || null}>
            <div className="grid">
              <ChipOption label="Todos" selected={!canal} onClick={() => setParam('canal', null)} />
              {facetas.canais.map((c) => (
                <ChipOption
                  key={c.canal}
                  label={`${c.canal} (${c.total})`}
                  selected={canal === c.canal}
                  onClick={() => setParam('canal', c.canal)}
                />
              ))}
            </div>
          </ChipPopover>
        )}

        {temFiltro && (
          <Button variant="ghost" size="sm" onClick={() => router.replace('/notificacoes')}>
            Limpar filtros
          </Button>
        )}
      </div>

      {itens.length > 0 ? (
        <>
          <ul className="divide-y rounded-xl border">
            {itens.map((n) => (
              <LinhaDeNotificacao
                key={n.id}
                n={n}
                onAlternarLida={() => void alternarLida(n)}
                onExcluir={() => setAExcluir(n)}
              />
            ))}
          </ul>

          {paginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                Página {page} de {paginas}
              </span>
              <div className="flex items-center gap-2">
                <Select value={String(limit)} onValueChange={(v) => setParam('limit', v)}>
                  <SelectTrigger className="h-8 w-[120px]">{limit}/página</SelectTrigger>
                  <SelectContent>
                    {POR_PAGINA.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}/página</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled={page <= 1}
                        onClick={() => setParam('page', String(page - 1))}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= paginas}
                        onClick={() => setParam('page', String(page + 1))}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed p-12 text-center">
          <Bell className="mb-3 h-8 w-8 text-muted-foreground/60" />
          <h2 className="mb-1 font-medium">
            {temFiltro ? 'Nenhuma notificação com esses filtros' : 'Nada por aqui ainda'}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {temFiltro
              ? 'Tente limpar os filtros para ver tudo.'
              : 'Quando um cliente responder uma arte ou comentar, o aviso aparece aqui.'}
          </p>
        </div>
      )}

      {/*
       * Excluir some com o aviso para sempre e não tem desfazer. Era um clique
       * só, do lado de "marcar como lida" — errar de botão custava a linha.
       */}
      <AlertDialog open={Boolean(aExcluir)} onOpenChange={(aberto) => !aberto && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta notificação?</AlertDialogTitle>
            <AlertDialogDescription>
              {aExcluir?.titulo} — some da sua lista e não dá para recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarExclusao()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FadeIn>
  );
}

/**
 * Duas linhas: o que aconteceu e o detalhe. O resto é meta.
 *
 * A linha inteira leva ao que o aviso está falando, quando há destino — antes
 * a notificação avisava e abandonava, sem caminho até a arte.
 */
function LinhaDeNotificacao({
  n, onAlternarLida, onExcluir,
}: {
  n: Notificacao;
  onAlternarLida: () => void;
  onExcluir: () => void;
}) {
  const Icone = ICONE_POR_TIPO[n.tipo] ?? Bell;
  const destino = destinoDaNotificacao(n);

  const corpo = (
    <>
      <span className={`mt-0.5 shrink-0 rounded-md border p-1.5 ${n.lida ? 'text-muted-foreground' : 'text-foreground'}`}>
        <Icone className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm ${n.lida ? 'font-normal' : 'font-medium'}`}>{n.titulo}</span>
          {!n.lida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="não lida" />}
        </div>
        <p className="line-clamp-1 text-sm text-muted-foreground">{n.conteudo}</p>
        {/*
         * Sem selo de tipo: o título já diz qual é ("Arte aprovada ✅", "Novo
         * feedback em X"), e repeti-lo logo abaixo é uma terceira linha que não
         * acrescenta nada. Quem distingue os tipos de relance é o ícone; o
         * rótulo continua servindo onde faz falta, no filtro.
         */}
        <p className="mt-1 text-xs text-muted-foreground">{quando(n.criadoEm)}</p>
      </div>
      {destino && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  );

  return (
    <li className={`group flex items-start gap-2 px-3 py-3 transition hover:bg-accent/50 ${n.lida ? '' : 'bg-primary/[0.03]'}`}>
      {destino ? (
        <Link href={destino} className="flex min-w-0 flex-1 items-start gap-3" onClick={() => !n.lida && onAlternarLida()}>
          {corpo}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{corpo}</div>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon" variant="ghost" className="h-8 w-8"
          title={n.lida ? 'Marcar como não lida' : 'Marcar como lida'}
          onClick={onAlternarLida}
        >
          <CheckCheck className={`h-4 w-4 ${n.lida ? 'text-muted-foreground' : 'text-primary'}`} />
        </Button>
        <Button
          size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Excluir" onClick={onExcluir}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

/*
 * `useSearchParams` exige um limite de Suspense, senão a rota inteira vira
 * render dinâmico — mesmo padrão de /artes e /projetos.
 */
export default function NotificacoesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando notificações…</div>}>
      <Notificacoes />
    </Suspense>
  );
}
