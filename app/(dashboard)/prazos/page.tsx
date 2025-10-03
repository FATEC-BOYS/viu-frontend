'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getBaseUrl } from '@/lib/baseUrl';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar'; // shadcn calendar (react-day-picker)

import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  MessageSquare,
  Link as LinkIcon,
  ChevronRight,
  Loader2,
} from 'lucide-react';

/* ===========================
   Tipos (derivados do schema)
   =========================== */

export type Projeto = {
  id: string;
  nome: string;
  prazo: string | null;
};

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  prazo: string | null;
  projeto: { nome: string } | null;
  arte: { nome: string } | null;
};

export type Aprovacao = {
  id: string;
  status: string;
  comentario: string | null;
  criado_em: string;
  arte: { id: string; nome: string } | null;
  arte_versao: { id: string; versao: number } | null;
  aprovador: { id: string; nome: string } | null;
};

export type Feedback = {
  id: string;
  conteudo: string;
  criado_em: string;
  status: 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO' | 'ARQUIVADO';
  criar_tarefa: boolean | null;
  arte: { id: string; nome: string } | null;
  arte_versao: { id: string; versao: number } | null;
};

export type LinkCompartilhado = {
  id: string;
  token: string;
  tipo: string;
  expira_em: string | null;
  can_comment: boolean;
  can_download: boolean;
  projeto: { id: string; nome: string } | null;
  arte: { id: string; nome: string } | null;
};

/* ===========================
   Utils
   =========================== */

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatWeekday(dateString?: string | null) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'short' });
  } catch {
    return '';
  }
}

function getPriorityBadge(p: Tarefa['prioridade']) {
  const map = {
    ALTA: 'destructive',
    MEDIA: 'default',
    BAIXA: 'secondary',
  } as const;
  return <Badge variant={map[p]}>{p}</Badge>;
}

/* ===========================
   Página de Prazos
   =========================== */

export default function PrazosPage() {
  const [loading, setLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(''); // busca rápida
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // mini calendário

  const [tarefasHoje, setTarefasHoje] = useState<Tarefa[]>([]);
  const [tarefasProximas, setTarefasProximas] = useState<Tarefa[]>([]);
  const [tarefasAtrasadas, setTarefasAtrasadas] = useState<Tarefa[]>([]);
  const [tarefasSemPrazo, setTarefasSemPrazo] = useState<Tarefa[]>([]);

  const [projetosComPrazo, setProjetosComPrazo] = useState<Projeto[]>([]);

  const [aprovacoesPendentes, setAprovacoesPendentes] = useState<Aprovacao[]>([]);
  const [feedbacksAbertos, setFeedbacksAbertos] = useState<Feedback[]>([]);
  const [linksExpirando, setLinksExpirando] = useState<LinkCompartilhado[]>([]);

  // âncora/scroll pro dia selecionado (opcional)
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setAuthIssue(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) console.error('Falha ao obter usuário:', userErr);
      if (!user) {
        setAuthIssue('Você precisa estar autenticado para ver os prazos.');
        setLoading(false);
        return;
      }

      try {
        const sevenDaysISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);

        const [tarefasQ, projetosQ, aprovacoesQ, feedbacksQ, linksQ] = await Promise.all([
          supabase
            .from('tarefas')
            .select(
              `id, titulo, descricao, status, prioridade, prazo, 
               projeto:projeto_id ( nome ),
               arte:arte_id ( nome )`
            )
            .in('status', ['PENDENTE', 'EM_ANDAMENTO']) as any,

          supabase.from('projetos').select(`id, nome, prazo`).not('prazo', 'is', null) as any,

          supabase
            .from('aprovacoes')
            .select(
              `id, status, comentario, criado_em,
               arte:arte_id ( id, nome ),
               arte_versao:arte_versao_id ( id, versao ),
               aprovador:aprovador_id ( id, nome )`
            )
            .eq('status', 'PENDENTE') as any,

          supabase
            .from('feedbacks')
            .select(
              `id, conteudo, criado_em, status, criar_tarefa,
               arte:arte_id ( id, nome ),
               arte_versao:arte_versao_id ( id, versao )`
            )
            .eq('status', 'ABERTO') as any,

          supabase
            .from('link_compartilhado')
            .select(
              `id, token, tipo, expira_em, can_comment, can_download,
               projeto:projeto_id ( id, nome ),
               arte:arte_id ( id, nome )`
            ) as any,
        ]);

        const tarefas = (tarefasQ.data || []) as Tarefa[];
        const projetos = (projetosQ.data || []) as Projeto[];
        const aprov = (aprovacoesQ.data || []) as Aprovacao[];
        const fbs = (feedbacksQ.data || []) as Feedback[];
        const links = (linksQ.data || []) as LinkCompartilhado[];

        // split de tarefas
        const hoje: Tarefa[] = [];
        const proximas: Tarefa[] = [];
        const atrasadas: Tarefa[] = [];
        const semPrazo: Tarefa[] = [];

        for (const t of tarefas) {
          if (!t.prazo) {
            semPrazo.push(t);
            continue;
          }
          const d = new Date(t.prazo);
          if (d < today) atrasadas.push(t);
          else if (d >= today && d < tomorrow) hoje.push(t);
          else proximas.push(t);
        }

        // ordenar
        const byDate = (a?: string | null, b?: string | null) => (a || '').localeCompare(b || '');
        hoje.sort((a, b) => byDate(a.prazo, b.prazo));
        proximas.sort((a, b) => byDate(a.prazo, b.prazo));
        atrasadas.sort((a, b) => byDate(a.prazo, b.prazo));

        // links expirando (<= 7 dias)
        const exp: LinkCompartilhado[] = links.filter((lk) => {
          if (!lk.expira_em) return false;
          const t = new Date(lk.expira_em).getTime();
          return t >= Date.now() && t <= new Date(sevenDaysISO).getTime();
        });

        setTarefasHoje(hoje);
        setTarefasProximas(proximas);
        setTarefasAtrasadas(atrasadas);
        setTarefasSemPrazo(semPrazo);
        setProjetosComPrazo(projectosSorted(projetos));
        setAprovacoesPendentes(aprov);
        setFeedbacksAbertos(fbs);
        setLinksExpirando(exp);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Não foi possível carregar os prazos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return { tarefasHoje, tarefasProximas, tarefasAtrasadas };
    const q = query.toLowerCase();
    const match = (t: Tarefa) =>
      t.titulo.toLowerCase().includes(q) ||
      (t.projeto?.nome?.toLowerCase().includes(q) ?? false) ||
      (t.arte?.nome?.toLowerCase().includes(q) ?? false);

    return {
      tarefasHoje: tarefasHoje.filter(match),
      tarefasProximas: tarefasProximas.filter(match),
      tarefasAtrasadas: tarefasAtrasadas.filter(match),
    };
  }, [query, tarefasHoje, tarefasProximas, tarefasAtrasadas]);

  // filtro por dia selecionado no mini-calendário
  const filteredProximasByDay = useMemo(() => {
    if (!selectedDate) return filtered.tarefasProximas;
    const key = selectedDate.toISOString().slice(0, 10);
    return filtered.tarefasProximas.filter((t) => (t.prazo ? t.prazo.slice(0, 10) === key : false));
  }, [selectedDate, filtered.tarefasProximas]);

  const projetosByDay = useMemo(() => {
    if (!selectedDate) return projetosComPrazo;
    const key = selectedDate.toISOString().slice(0, 10);
    return projetosComPrazo.filter((p) => (p.prazo ? p.prazo.slice(0, 10) === key : false));
  }, [selectedDate, projetosComPrazo]);

  // scroll automático até o dia (quando NÃO filtrar a lista)
  useEffect(() => {
    if (!selectedDate || !timelineRef.current) return;
    const key = selectedDate.toISOString().slice(0, 10);
    const el = timelineRef.current.querySelector<HTMLDivElement>(`[data-day="${key}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedDate, filteredProximasByDay.length]); // se estiver filtrando, muitas vezes a âncora já é o primeiro item

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando prazos...
      </div>
    );
  }

  if (authIssue) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">{authIssue}</p>
        <Button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${getBaseUrl()}/auth/callback` },
            })
          }
        >
          Entrar com Google
        </Button>
      </div>
    );
  }

  if (error) {
    return <div className="h-[60vh] flex items-center justify-center text-destructive">{error}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-7 w-7" /> Prazos
          </h1>
          <p className="text-muted-foreground">Veja o que vence hoje, o que está atrasado e o que vem por aí.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tarefa, arte ou projeto"
            className="w-72"
          />
          <Button asChild variant="outline">
            <Link href="/projetos">Ver projetos</Link>
          </Button>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hoje */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Vence hoje
              </CardTitle>
              <CardDescription>Tarefas cuja data é hoje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filtered.tarefasHoje.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada para hoje. Ufa! 🎉</p>
              ) : (
                <div className="space-y-3">
                  {filtered.tarefasHoje.map((t) => (
                    <RowTarefa key={t.id} t={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atrasadas */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Atrasadas
              </CardTitle>
              <CardDescription>Priorize estas tarefas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filtered.tarefasAtrasadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem atrasos por aqui ✅</p>
              ) : (
                <div className="space-y-3">
                  {filtered.tarefasAtrasadas.map((t) => (
                    <RowTarefa key={t.id} t={t} overdue />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximos 30 dias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" /> Próximos 30 dias
              </CardTitle>
              <CardDescription>Tarefas e marcos de projeto que chegam em breve.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">{/* evita estourar a caixinha */}
              <ScrollArea className="max-h-[48vh] pr-4" ref={timelineRef}>
                <Timeline
                  tarefas={filteredProximasByDay}
                  projetos={projetosByDay}
                  enableDayAnchors={!selectedDate} // quando não filtra, cria âncoras por dia
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Lateral */}
        <div className="space-y-6">
          {/* Mini Calendário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" /> Calendário
              </CardTitle>
              <CardDescription>Selecione um dia para filtrar</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              <div className="mt-3 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(undefined)}>
                  Limpar
                </Button>
                {selectedDate && <Badge variant="outline">{formatDate(selectedDate.toISOString())}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Visão rápida do status</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Stat label="Hoje" value={String(tarefasHoje.length)} />
              <Stat label="Atrasadas" value={String(tarefasAtrasadas.length)} />
              <Stat label="Próx. 30d" value={String(tarefasProximas.length)} />
              <Stat label="Sem prazo" value={String(tarefasSemPrazo.length)} />
            </CardContent>
          </Card>

          {/* Aprovações pendentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" /> Aprovações pendentes
              </CardTitle>
              <CardDescription>Itens aguardando decisão</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aprovacoesPendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma aprovação pendente</p>
              ) : (
                aprovacoesPendentes.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {a.arte?.nome ?? 'Arte'} {a.arte_versao?.versao ? `• v${a.arte_versao.versao}` : ''}
                      </p>
                      <Badge variant="outline">{new Date(a.criado_em).toLocaleDateString('pt-BR')}</Badge>
                    </div>
                    {a.comentario && <p className="text-muted-foreground line-clamp-2">{a.comentario}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Feedbacks a tratar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Feedbacks a tratar
              </CardTitle>
              <CardDescription>Feedbacks abertos (criar tarefa)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedbacksAbertos.filter((f) => f.criar_tarefa).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum feedback pendente de ação</p>
              ) : (
                feedbacksAbertos
                  .filter((f) => f.criar_tarefa)
                  .slice(0, 5)
                  .map((f) => (
                    <div key={f.id} className="text-sm">
                      <p className="font-medium">
                        {f.arte?.nome ?? 'Arte'} {f.arte_versao?.versao ? `• v${f.arte_versao.versao}` : ''}
                      </p>
                      <p className="text-muted-foreground line-clamp-2">{f.conteudo}</p>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Links expirando */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" /> Links expirando (7d)
              </CardTitle>
              <CardDescription>Renove ou deixe expirar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {linksExpirando.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum link próximo do vencimento</p>
              ) : (
                linksExpirando.slice(0, 5).map((lk) => (
                  <div key={lk.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{lk.projeto?.nome || lk.arte?.nome || lk.tipo}</p>
                      <Badge variant="outline">{formatDate(lk.expira_em)}</Badge>
                    </div>
                    <p className="text-muted-foreground">Token: {lk.token.slice(0, 8)}…</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Sem prazo */}
          {tarefasSemPrazo.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Itens sem prazo
                </CardTitle>
                <CardDescription>Defina uma data para organizar o fluxo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tarefasSemPrazo.slice(0, 8).map((t) => (
                  <div key={t.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{t.titulo}</p>
                      <Badge variant="secondary">{t.prioridade}</Badge>
                    </div>
                    <p className="text-muted-foreground">{t.projeto?.nome ?? t.arte?.nome ?? '—'}</p>
                  </div>
                ))}
                {tarefasSemPrazo.length > 8 && (
                  <Button asChild variant="link" className="px-0">
                    <Link href="/tarefas?f=sem-prazo">Ver todas</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Subcomponentes
   =========================== */

function RowTarefa({ t, overdue }: { t: Tarefa; overdue?: boolean }) {
  return (
    <div className={`p-3 border rounded-lg ${overdue ? 'border-destructive/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-sm">{t.titulo}</p>
          <p className="text-xs text-muted-foreground">{t.projeto?.nome || t.arte?.nome || '—'}</p>
          {t.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{t.descricao}</p>}
        </div>
        <div className="text-right space-y-1 min-w-[130px]">
          <div className="flex items-center justify-end gap-2">
            {getPriorityBadge(t.prioridade)}
            <Badge variant="outline">{t.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatWeekday(t.prazo)} • {formatDate(t.prazo)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 border rounded-lg text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

/**
 * Timeline com correção de overflow:
 * - sem elementos posicionados fora do fluxo (sem absolute vazando do card)
 * - linha vertical com border-l
 * - marcador (dot) inline
 * - opcionalmente cria âncoras por dia para scrollIntoView
 */
function Timeline({
  tarefas,
  projetos,
  enableDayAnchors = true,
}: {
  tarefas: Tarefa[];
  projetos: Projeto[];
  enableDayAnchors?: boolean;
}) {
  type Item = { kind: 'tarefa'; data: Tarefa } | { kind: 'marco'; data: Projeto };
  const map = new Map<string, Item[]>();

  tarefas.forEach((t) => {
    if (!t.prazo) return;
    const key = new Date(t.prazo).toISOString().slice(0, 10);
    const arr = map.get(key) || [];
    arr.push({ kind: 'tarefa', data: t });
    map.set(key, arr);
  });

  projetos.forEach((p) => {
    if (!p.prazo) return;
    const key = new Date(p.prazo).toISOString().slice(0, 10);
    const arr = map.get(key) || [];
    arr.push({ kind: 'marco', data: p });
    map.set(key, arr);
  });

  const days = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (days.length === 0) return <p className="text-sm text-muted-foreground">Nada previsto nos próximos 30 dias.</p>;

  return (
    <div className="space-y-6">
      {days.map(([iso, items]) => (
        <div
          key={iso}
          className="pl-4 border-l border-border"
          {...(enableDayAnchors ? { 'data-day': iso } : {})}
        >
          {/* Header do dia */}
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm font-medium">
              {formatDate(iso)} <span className="text-xs text-muted-foreground">{formatWeekday(iso)}</span>
            </p>
          </div>

          {/* Itens */}
          <div className="space-y-2">
            {items
              .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'marco' ? -1 : 1))
              .map((it, idx) => {
                if (it.kind === 'marco') {
                  const p = it.data as Projeto;
                  return (
                    <div key={idx} className="ml-2 flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Marco: {p.nome}</span>
                      </div>
                      <Button asChild variant="link" className="px-0 text-sm">
                        <Link href={`/projetos/${p.id}`}>
                          abrir <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                }
                const t = it.data as Tarefa;
                return (
                  <div key={idx} className="ml-2">
                    <RowTarefa t={t} />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===========================
   Helpers locais
   =========================== */

function projectosSorted(projetos: Projeto[]) {
  return [...projetos].sort((a, b) => (a.prazo || '').localeCompare(b.prazo || ''));
}
