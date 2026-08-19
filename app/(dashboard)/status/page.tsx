'use client';

import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
}

interface Counters {
  feedbacks: number;
  artes: number;
  projetos: number;
  // null quando o usuário não é ADMIN e não pode consultar /usuarios
  usuarios: number | null;
}

const initialCounters: Counters = { feedbacks: 0, artes: 0, projetos: 0, usuarios: null };

export default function StatusPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [counters, setCounters] = useState<Counters>(initialCounters);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const StatusPill = ({ status }: { status: CheckStatus }) => {
    if (status === 'ok') return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">OK</Badge>;
    if (status === 'warn') return <Badge className="bg-amber-100 text-amber-800 border border-amber-200">AVISO</Badge>;
    if (status === 'error') return <Badge className="bg-red-100 text-red-700 border border-red-200">ERRO</Badge>;
    return <Badge variant="secondary">–</Badge>;
  };

  const safeGet = async (path: string): Promise<any> => {
    try { return await api.get(path); } catch { return null; }
  };

  const runChecks = async () => {
    setRefreshing(true);
    try {
      const [feedbacksRes, artesRes, projetosRes, usuariosRes] = await Promise.all([
        safeGet('/feedbacks?limit=1'),
        safeGet('/artes?limit=1'),
        safeGet('/projetos?limit=1'),
        // /usuarios é restrito a ADMIN — checar o banco por ele fazia todo
        // designer ver "Banco de dados: ERRO". /projetos já prova a conexão,
        // e o contador de usuários só é consultado por quem pode vê-lo.
        user?.tipo === 'ADMIN' ? safeGet('/usuarios?limit=1') : Promise.resolve(null),
      ]);

      const apiOk = feedbacksRes !== null;

      setChecks([
        {
          label: 'Backend API',
          status: apiOk ? 'ok' : 'error',
          detail: apiOk ? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'}` : 'Sem resposta',
        },
        {
          label: 'Banco de dados',
          status: projetosRes !== null ? 'ok' : 'error',
          detail: projetosRes !== null
            ? `${projetosRes.pagination?.total ?? 0} projetos`
            : 'Falha na consulta',
        },
      ]);

      setCounters({
        feedbacks: feedbacksRes?.pagination?.total ?? 0,
        artes: artesRes?.pagination?.total ?? 0,
        projetos: projetosRes?.pagination?.total ?? 0,
        usuarios: usuariosRes?.pagination?.total ?? null,
      });

      setLastRun(new Date());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { runChecks(); }, []);

  const overallStatus: CheckStatus = useMemo(() => {
    if (checks.some((c) => c.status === 'error')) return 'error';
    if (checks.some((c) => c.status === 'warn')) return 'warn';
    if (checks.some((c) => c.status === 'ok')) return 'ok';
    return 'idle';
  }, [checks]);

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Status do Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Saúde da aplicação (Vercel + viu-backend) e métricas rápidas
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            {overallStatus === 'ok' && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            {(overallStatus === 'warn' || overallStatus === 'error') && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
            Status Geral
            <StatusPill status={overallStatus} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  {c.label === 'Backend API' && <Server className="h-4 w-4" />}
                  {c.label === 'Banco de dados' && <Database className="h-4 w-4" />}
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
              Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counters.projetos}</div>
            <Progress value={Math.min(counters.projetos, 100)} className="mt-2" />
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
            <div className="text-3xl font-bold">{counters.usuarios ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {counters.usuarios === null ? "Visível só para administradores" : "Registro total"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Ambiente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="Runtime">Next.js (client) • Browser</InfoRow>
          <InfoRow label="Backend URL">
            {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'}
          </InfoRow>
          <InfoRow label="User Agent">
            {typeof navigator !== 'undefined' ? navigator.userAgent : '—'}
          </InfoRow>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-all">{children}</span>
    </div>
  );
}
