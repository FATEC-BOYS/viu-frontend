'use client';

import { prioridadeLabel, statusLabel } from "@/lib/tarefas";
import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api, getAll } from '@/lib/api';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';

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
   Tipos
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
};

export type Aprovacao = {
  id: string;
  status: string;
  comentario: string | null;
  criadoEm: string;
  arte: { id: string; nome: string } | null;
  aprovador: { id: string; nome: string } | null;
};

export type Feedback = {
  id: string;
  conteudo: string;
  criadoEm: string;
  status: string;
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
  return <Badge variant={map[p]}>{prioridadeLabel[p] ?? p}</Badge>;
}

function mapTarefa(t: any): Tarefa {
  return {
    id: t.id,
    titulo: t.titulo,
    descricao: t.descricao ?? null,
    status: t.status,
    prioridade: t.prioridade,
    prazo: t.prazo ?? null,
    projeto: t.projeto ? { nome: t.projeto.nome } : null,
  };
}

/* ===========================
   Página de Prazos
   =========================== */

export default function PrazosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [tarefasHoje, setTarefasHoje] = useState<Tarefa[]>([]);
  const [tarefasProximas, setTarefasProximas] = useState<Tarefa[]>([]);
  const [tarefasAtrasadas, setTarefasAtrasadas] = useState<Tarefa[]>([]);
  const [tarefasSemPrazo, setTarefasSemPrazo] = useState<Tarefa[]>([]);

  const [projetosComPrazo, setProjetosComPrazo] = useState<Projeto[]>([]);
  const [aprovacoesPendentes, setAprovacoesPendentes] = useState<Aprovacao[]>([]);
  const [feedbacksAbertos, setFeedbacksAbertos] = useState<Feedback[]>([]);

  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);

        const [pendentes, andamento, todosProjetos, aprovacoesRes, feedbacksRes] = await Promise.all([
          getAll<any>('/tarefas?status=PENDENTE'),
          getAll<any>('/tarefas?status=EM_ANDAMENTO'),
          getAll<any>('/projetos'),
          api.get<{ data: any[] }>('/aprovacoes?status=PENDENTE&limit=50'),
          api.get<{ data: any[] }>('/feedbacks?status=ABERTO&limit=50'),
        ]);

        const tarefas = [...pendentes, ...andamento].map(mapTarefa);

        const projetos: Projeto[] = todosProjetos
          .filter((p: any) => p.prazo)
          .map((p: any) => ({ id: p.id, nome: p.nome, prazo: p.prazo }));

        const aprovacoes: Aprovacao[] = (aprovacoesRes.data || []).map((a: any) => ({
          id: a.id,
          status: a.status,
          comentario: a.comentario ?? null,
          criadoEm: a.criadoEm ?? '',
          arte: a.arte ? { id: a.arte.id, nome: a.arte.nome } : null,
          aprovador: a.aprovador ? { id: a.aprovador.id, nome: a.aprovador.nome } : null,
        }));

        const feedbacks: Feedback[] = (feedbacksRes.data || []).map((f: any) => ({
          id: f.id,
          conteudo: f.conteudo,
          criadoEm: f.criadoEm ?? '',
          status: f.status,
          arte: f.arte ? { id: f.arte.id, nome: f.arte.nome } : null,
        }));

        const hoje: Tarefa[] = [];
        const proximas: Tarefa[] = [];
        const atrasadas: Tarefa[] = [];
        const semPrazo: Tarefa[] = [];

        for (const t of tarefas) {
          if (!t.prazo) { semPrazo.push(t); continue; }
          const d = new Date(t.prazo);
          if (d < today) atrasadas.push(t);
          else if (d >= today && d < tomorrow) hoje.push(t);
          else proximas.push(t);
        }

        const byDate = (a?: string | null, b?: string | null) => (a || '').localeCompare(b || '');
        hoje.sort((a, b) => byDate(a.prazo, b.prazo));
        proximas.sort((a, b) => byDate(a.prazo, b.prazo));
        atrasadas.sort((a, b) => byDate(a.prazo, b.prazo));

        setTarefasHoje(hoje);
        setTarefasProximas(proximas);
        setTarefasAtrasadas(atrasadas);
        setTarefasSemPrazo(semPrazo);
        setProjetosComPrazo([...projetos].sort((a, b) => (a.prazo || '').localeCompare(b.prazo || '')));
        setAprovacoesPendentes(aprovacoes);
        setFeedbacksAbertos(feedbacks);
      } catch (e: any) {
        setError(e?.message ?? 'Não foi possível carregar os prazos.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (!query) return { tarefasHoje, tarefasProximas, tarefasAtrasadas };
    const q = query.toLowerCase();
    const match = (t: Tarefa) =>
      t.titulo.toLowerCase().includes(q) ||
      (t.projeto?.nome?.toLowerCase().includes(q) ?? false);

    return {
      tarefasHoje: tarefasHoje.filter(match),
      tarefasProximas: tarefasProximas.filter(match),
      tarefasAtrasadas: tarefasAtrasadas.filter(match),
    };
  }, [query, tarefasHoje, tarefasProximas, tarefasAtrasadas]);

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

  useEffect(() => {
    if (!selectedDate || !timelineRef.current) return;
    const key = selectedDate.toISOString().slice(0, 10);
    const el = timelineRef.current.querySelector<HTMLDivElement>(`[data-day="${key}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedDate, filteredProximasByDay.length]);

  if (!user) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">Você precisa estar autenticado para ver os prazos.</p>
        <Button asChild><Link href="/login">Fazer login</Link></Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando prazos...
      </div>
    );
  }

  if (error) {
    return <div className="h-[60vh] flex items-center justify-center text-destructive">{error}</div>;
  }

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-7 w-7" /> Prazos
          </h1>
          <p className="text-sm text-muted-foreground">Veja o que vence hoje, o que está atrasado e o que vem por aí.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tarefa ou projeto"
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
            <CardContent className="overflow-hidden">
              <ScrollArea className="max-h-[48vh] pr-4" ref={timelineRef}>
                <Timeline
                  tarefas={filteredProximasByDay}
                  projetos={projetosByDay}
                  enableDayAnchors={!selectedDate}
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
                      <p className="font-medium">{a.arte?.nome ?? 'Arte'}</p>
                      <Badge variant="outline">{new Date(a.criadoEm).toLocaleDateString('pt-BR')}</Badge>
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
                <MessageSquare className="h-5 w-5" /> Feedbacks abertos
              </CardTitle>
              <CardDescription>Feedbacks que aguardam ação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedbacksAbertos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum feedback aberto</p>
              ) : (
                feedbacksAbertos.slice(0, 5).map((f) => (
                  <div key={f.id} className="text-sm">
                    <p className="font-medium">{f.arte?.nome ?? 'Arte'}</p>
                    <p className="text-muted-foreground line-clamp-2">{f.conteudo}</p>
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
                      <Badge variant="secondary">{prioridadeLabel[t.prioridade] ?? t.prioridade}</Badge>
                    </div>
                    <p className="text-muted-foreground">{t.projeto?.nome ?? '—'}</p>
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
    </FadeIn>
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
          <p className="text-xs text-muted-foreground">{t.projeto?.nome || '—'}</p>
          {t.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{t.descricao}</p>}
        </div>
        <div className="text-right space-y-1 min-w-[130px]">
          <div className="flex items-center justify-end gap-2">
            {getPriorityBadge(t.prioridade)}
            <Badge variant="outline">{statusLabel[t.status] ?? t.status}</Badge>
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
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm font-medium">
              {formatDate(iso)} <span className="text-xs text-muted-foreground">{formatWeekday(iso)}</span>
            </p>
          </div>

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
