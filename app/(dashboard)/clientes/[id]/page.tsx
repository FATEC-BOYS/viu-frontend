'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { iniciais } from "@/lib/iniciais";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { createProjeto } from '@/lib/projects';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/layout/EmptyState';
import { FadeIn } from '@/components/layout/Motion';
import { PINO, ROTULO, recadoDoCliente, clientesApi, type Cliente } from '@/lib/clientes';
import { quandoPorExtenso } from '@/lib/prazos';
import { ArrowLeft, ArrowUpRight, Mail, Phone, Plus, Search, Users } from 'lucide-react';

/* =========================
   Tipos
   ========================= */


/*
 * As formas locais de `Projeto` e `Cliente` saíram daqui.
 *
 * Descreviam o que esta tela montava à mão a partir de `/projetos`, com campos
 * que ela nunca desenhava (`tipo`, `atualizado_em`) e um `artes: Arte[]` que o
 * código preenchia sempre com lista vazia. Agora a carteira vem pronta do
 * servidor, e repetir a forma aqui seria o começo de duas verdades sobre o que
 * é um cliente.
 */

/* =========================
   Helpers
   ========================= */
const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const formatBRLFromCents = (v?: number | null) =>
  typeof v === 'number' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100) : '—';

/* =========================
   Página
   ========================= */
export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clienteId = params?.id;
  const { user } = useAuth();

  // ===== State base =====
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== Filtros locais para lista de projetos =====
  const [busca, setBusca] = useState('');

  // ===== Fallback seguro para não quebrar ordem de hooks =====
  const clienteSafe: Cliente = cliente ?? {
    id: '',
    nome: '—',
    email: '',
    telefone: null,
    avatar: null,
    vinculado: true,
    criadoEm: '',
    projetos: [],
  };

  // ===== Fetch =====
  async function load() {
    if (!clienteId) return;
    if (!user) {
      setError('Faça login para ver este cliente.');
      setCliente(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      /*
       * Uma requisição, estreitada no banco.
       *
       * A tela baixava TODOS os projetos do designer (`getAll('/projetos')`,
       * cem por página até vinte páginas) e procurava o cliente na lista — mais
       * uma segunda chamada a `/vinculos/rompidos`. Além do custo, `getAll`
       * para na vigésima página em silêncio: passando de dois mil projetos,
       * esta tela afirmava "Cliente não encontrado na sua carteira" sobre
       * alguém que está lá.
       *
       * `GET /clientes/:id` responde com o mesmo escopo — só sai cliente que
       * tem projeto com este designer — lido por quem tem o índice.
       */
      setCliente(await clientesApi.get(clienteId));
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível carregar o cliente.');
      setCliente(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, user]);

  /*
   * A busca só existe quando há lista para buscar. Um campo de busca e quatro
   * abas de filtro acima de UM projeto era o que empurrava a tela para fora da
   * largura do celular.
   */
  const projetos = clienteSafe.projetos;
  const temBusca = projetos.length > 4;

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = q
      ? projetos.filter(
          (p) => p.nome.toLowerCase().includes(q) || (p.descricao ?? '').toLowerCase().includes(q),
        )
      : projetos;

    /*
     * A ordem já vem do servidor: quem tem prazo primeiro, do mais urgente ao
     * menos, e sem prazo no fim pelo mais recente. A regra era reimplementada
     * aqui, e a mesma regra em dois lugares é a que sai de sincronia quando
     * alguém mexe num só — filtrar preserva a ordem de entrada, então não há o
     * que reordenar.
     */
    return arr;
  }, [projetos, busca]);

  // ===== Ações =====
  /**
   * Rompe ou restaura o vínculo. A conta do cliente não é tocada e nada do
   * histórico é apagado — ele só sai (ou volta) para a carteira do designer.
   */
  const toggleVinculo = async () => {
    if (!cliente) return;
    const acao = cliente.vinculado ? 'romper' : 'restaurar';
    try {
      setBusy(true);
      await api.put(`/vinculos/${cliente.id}/${acao}`, {});
      setCliente({ ...cliente, vinculado: !cliente.vinculado });
      toast.success(cliente.vinculado ? 'Vínculo rompido. Os projetos continuam aqui.' : 'Vínculo restaurado.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível alterar o vínculo.');
    } finally {
      setBusy(false);
    }
  };

  const criarProjetoRápido = async () => {
    if (!cliente || !user) return;
    try {
      setBusy(true);
      const novo = await createProjeto({
        nome: `Projeto de ${cliente.nome}`,
        descricao: null,
        status: 'EM_ANDAMENTO',
        orcamento: 0,
        prazo: null,
        cliente_id: cliente.id,
      });
      toast.success('Projeto criado!');
      router.push(`/projetos/${novo.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao criar projeto.');
    } finally {
      setBusy(false);
    }
  };

  // ===== Loading / Error =====
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="text-sm text-muted-foreground">Carregando cliente…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Deu ruim por aqui.</p>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={load}>Recarregar</Button>
        </div>
      </div>
    );
  }

  /* =========================
     UI
     ========================= */
  const telefoneLimpo = (clienteSafe.telefone ?? '').replace(/\D/g, '');

  return (
    <FadeIn className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/clientes">
          <ArrowLeft className="mr-1 h-4 w-4" /> Clientes
        </Link>
      </Button>

      {/* Quem é a pessoa, como falar com ela, e como está o trabalho. */}
      <header className="flex flex-wrap items-start gap-4">
        <Avatar className="size-12 shrink-0">
          <AvatarImage src={clienteSafe.avatar || undefined} alt={clienteSafe.nome} className="object-cover" />
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {iniciais(clienteSafe.nome)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{clienteSafe.nome}</h1>
            {/* O selo só aparece quando diz algo: "Vínculo ativo" em toda tela
                é ruído — o normal não precisa de etiqueta. */}
            {!clienteSafe.vinculado && <Badge variant="destructive">Vínculo rompido</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{recadoDoCliente(projetos)}</p>
        </div>

        <Button onClick={criarProjetoRápido} disabled={busy} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Novo projeto
        </Button>
      </header>

      {/* Projetos */}
      <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            Projetos <span className="tabular-nums">{projetos.length}</span>
          </h2>
          {temBusca && (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar projeto…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          )}
        </div>

        {visiveis.length === 0 ? (
          projetos.length === 0 ? (
            <EmptyState
              icon={Users}
              tom="menta"
              title="Nenhum projeto com este cliente"
              description="Criar o projeto é o primeiro passo — depois vem a arte, e o link que leva a arte até ele."
              actionLabel="Criar projeto"
              onAction={criarProjetoRápido}
              className="border-0"
            />
          ) : (
            <EmptyState
              variante="filtro"
              title="Nada com esse termo"
              actionLabel="Limpar busca"
              onAction={() => setBusca('')}
            />
          )
        ) : (
          <ul className="flex flex-col">
            {visiveis.map((p) => (
              <li key={p.id} className="border-b last:border-b-0">
                <Link
                  href={`/projetos/${p.id}`}
                  className="flex items-stretch gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span aria-hidden className={`w-[3px] shrink-0 rounded-full ${PINO[p.status]}`} />
                  {/* Mesmo arranjo da agenda de Prazos: no desktop o prazo fica
                      à direita; no celular ele desce para a própria linha em vez
                      de espremer o nome do projeto. */}
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                    <span className="min-w-0 flex-1 basis-52">
                      <span className="block truncate text-sm font-medium">{p.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {ROTULO[p.status]}
                        {p.orcamento ? ` · ${formatBRLFromCents(p.orcamento)}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {p.prazo ? quandoPorExtenso(p.prazo) : 'sem prazo'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Os dois caminhos que continuam o trabalho, sem virar um cartão de
            "Ações rápidas" com um botão fantasma. */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs">
          <Link href="/artes?novo=1" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Enviar uma arte
          </Link>
          <Link href={`/feedbacks?cliente=${clienteSafe.id}`} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Ver os comentários dele
          </Link>
        </div>
      </section>

      {/* Contato */}
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
          Contato
        </h2>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Mail className="size-3.5 shrink-0 text-muted-foreground" />
          <a href={`mailto:${clienteSafe.email}`} className="min-w-0 break-all hover:underline">
            {clienteSafe.email}
          </a>
        </div>

        {clienteSafe.telefone && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Phone className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{clienteSafe.telefone}</span>
            {/* O telefone existe para ser usado: abrir a conversa é o que se
                faz com ele, e o designer já manda link de revisão por ali. */}
            <a
              href={`https://wa.me/55${telefoneLimpo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              WhatsApp <ArrowUpRight className="size-3" />
            </a>
          </div>
        )}

        {clienteSafe.criadoEm && (
          <p className="text-xs text-muted-foreground">
            Cliente desde {formatDate(clienteSafe.criadoEm)}
          </p>
        )}
      </section>

      {/*
        Romper vínculo fica no fim e discreto: é a única ação desta tela que
        tira algo de lugar. Ela não apaga nada — os projetos continuam aqui — e
        o texto do botão precisa dizer isso, já que "romper" soa definitivo.
      */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button variant="outline" size="sm" onClick={toggleVinculo} disabled={busy}>
          {clienteSafe.vinculado ? 'Romper vínculo' : 'Restaurar vínculo'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {clienteSafe.vinculado
            ? 'Tira o cliente da sua carteira. Os projetos e o histórico continuam.'
            : 'Traz o cliente de volta para a sua carteira.'}
        </p>
      </div>
    </FadeIn>
  );
}
