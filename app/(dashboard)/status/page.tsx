'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Cloud,
  HardDrive,
  Users,
  MessageSquare,
  Image as ImageIcon,
  Server,
  Clock,
} from 'lucide-react';

type CheckStatus = 'ok' | 'warn' | 'error' | 'idle';

interface HealthCheck {
  label: string;
  status: CheckStatus;
  detail?: string;
  value?: number;
  max?: number;
}

interface Counters {
  feedbacks: number;
  artes: number;
  projetos: number;
  usuarios: number;
  storageBuckets: number;
}

const initialCounters: Counters = {
  feedbacks: 0,
  artes: 0,
  projetos: 0,
  usuarios: 0,
  storageBuckets: 0,
};

export default function StatusPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [counters, setCounters] = useState<Counters>(initialCounters);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  // Helpers de ícone/cores
  const StatusPill = ({ status }: { status: CheckStatus }) => {
    if (status === 'ok') return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">OK</Badge>;
    if (status === 'warn') return <Badge className="bg-amber-100 text-amber-800 border border-amber-200">AVISO</Badge>;
    if (status === 'error') return <Badge className="bg-red-100 text-red-700 border border-red-200">ERRO</Badge>;
    return <Badge variant="secondary">–</Badge>;
  };

  const checkSupabaseAuth = async (): Promise<HealthCheck> => {
    try {
      // ping simples: quem sou eu?
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const status: CheckStatus = 'ok';
      const who = data?.session?.user?.email ? `sessão: ${data.session.user.email}` : 'sem sessão (público)';
      return { label: 'Supabase Auth', status, detail: who };
    } catch (e) {
      return { label: 'Supabase Auth', status: 'warn', detail: 'Sem sessão (não bloqueante)' };
    }
  };

  const checkPostgrest = async (): Promise<HealthCheck> => {
    try {
      // head count em tabela leve para validar PostgREST
      const { count, error } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return { label: 'PostgREST', status: 'ok', detail: `usuarios: ${count ?? 0}` };
    } catch (e) {
      return { label: 'PostgREST', status: 'error', detail: 'Falha ao consultar API' };
    }
  };

  const checkStorage = async (): Promise<{ status: HealthCheck; buckets: number }> => {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      const qty = data?.length ?? 0;
      return {
        status: { label: 'Storage', status: qty > 0 ? 'ok' : 'warn', detail: `${qty} bucket(s)` },
        buckets: qty,
      };
    } catch (e) {
      return { status: { label: 'Storage', status: 'error', detail: 'Falha ao listar buckets' }, buckets: 0 };
    }
  };

  const countTable = async (table: 'feedbacks' | 'artes' | 'projetos' | 'usuarios'): Promise<number> => {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  };

  const runChecks = async () => {
    setRefreshing(true);
    try {
      const [auth, postgrest, storage, feedbacks, artes, projetos, usuarios] = await Promise.all([
        checkSupabaseAuth(),
        checkPostgRESTSafe(),
        checkStorage(),
        safeCount('feedbacks'),
        safeCount('artes'),
        safeCount('projetos'),
        safeCount('usuarios'),
      ]);

      setChecks([
        auth,
        postgrest,
        storage.status,
      ]);

      setCounters({
        feedbacks,
        artes,
        projetos,
        usuarios,
        storageBuckets: storage.buckets,
      });

      setLastRun(new Date());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // versões "safe" com degrade para não quebrar a página
  const safeCount = async (table: 'feedbacks' | 'artes' | 'projetos' | 'usuarios'): Promise<number> => {
    try {
      return await countTable(table);
    } catch {
      return 0;
    }
  };

  const checkPostgRESTSafe = async (): Promise<HealthCheck> => {
    try {
      return await checkPostgrest();
    } catch {
      return { label: 'PostgREST', status: 'error', detail: 'Erro inesperado' };
    }
  };

  useEffect(() => {
    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overallStatus: CheckStatus = useMemo(() => {
    if (checks.some((c) => c.status === 'error')) return 'error';
    if (checks.some((c) => c.status === 'warn')) return 'warn';
    if (checks.some((c) => c.status === 'ok')) return 'ok';
    return 'idle';
  }, [checks]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Status do Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Saúde da aplicação (Vercel + Supabase) e métricas rápidas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRun && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Atualizado: {lastRun.toLocaleString('pt-BR')}</span>
            </div>
          )}
          <Button onClick={runChecks} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Overall */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            {overallStatus === 'ok' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {overallStatus === 'warn' && <XCircle className="h-5 w-5 text-amber-600" />}
            {overallStatus === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
            Status Geral
            <StatusPill status={overallStatus} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  {c.label === 'PostgREST' && <Database className="h-4 w-4" />}
                  {c.label === 'Supabase Auth' && <Users className="h-4 w-4" />}
                  {c.label === 'Storage' && <Cloud className="h-4 w-4" />}
                  <span className="font-medium">{c.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{c.detail}</span>
                  <StatusPill status={c.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedbacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counters.feedbacks}</div>
            <Progress value={Math.min(counters.feedbacks, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Artes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counters.artes}</div>
            <Progress value={Math.min(counters.artes, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Buckets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counters.storageBuckets}</div>
            <p className="text-xs text-muted-foreground mt-1">Supabase Storage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counters.usuarios}</div>
            <p className="text-xs text-muted-foreground mt-1">Registro total</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Ambiente */}
      <Card>
        <CardHeader>
          <CardTitle>Ambiente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="Runtime">
            Next.js (client) • Browser
          </InfoRow>
          <InfoRow label="Endpoint Supabase">
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? maskUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) : '—'}
          </InfoRow>
          <InfoRow label="Anon Key">
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definida' : '—'}
          </InfoRow>
          <InfoRow label="User Agent">
            {typeof navigator !== 'undefined' ? navigator.userAgent : '—'}
          </InfoRow>
        </CardContent>
      </Card>
    </div>
  );
}

/* =============== auxiliares visuais =============== */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-all">{children}</span>
    </div>
  );
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}
