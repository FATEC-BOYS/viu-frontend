// components/layout/Sidebar.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home, FolderOpen, FileImage, CheckSquare, Users, MessageSquare, Bell,
  BarChart3, Clock, Settings, User, Link as LinkIcon, ChevronDown, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- helpers ---------------------------------------------------------------

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

type MaybeNumber = number | null | undefined;

interface Contadores {
  tarefasPendentes: MaybeNumber;
  feedbacksPendentes: MaybeNumber;
  notificacoesNaoLidas: MaybeNumber;
  projetsVencendo: MaybeNumber;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: MaybeNumber;
  disabled?: boolean;
}
interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

// mostra badge só quando há valor definido e > 0
function renderBadge(value: MaybeNumber) {
  if (typeof value !== 'number' || value <= 0) return null;
  return (
    <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1.5">
      {value > 99 ? '99+' : value}
    </Badge>
  );
}

// --- componente ------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();
  const mounted = useMounted();

  const [contadores, setContadores] = useState<Contadores>({
    tarefasPendentes: undefined,
    feedbacksPendentes: undefined,
    notificacoesNaoLidas: undefined,
    projetsVencendo: undefined
  });

  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});
  const fetchingRef = useRef(false);

  // evita hydration: só pintamos "ativo" após montar
  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // busca contadores “reais”
  useEffect(() => {
    let alive = true;

    async function fetchContadores() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        // garante sessão (importante p/ RLS e row-level filters)
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        // se tiver RLS por usuário e quiser filtrar por ele, ajuste aqui.
        // exemplo: .eq('responsavel_id', userId)

        // Tarefas PENDENTE/EM_ANDAMENTO
        const { count: tarefasPendentes } = await supabase
          .from('tarefas')
          .select('*', { count: 'exact', head: true })
          .in('status', ['PENDENTE', 'EM_ANDAMENTO']);

        // Feedbacks últimos 7 dias
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 7);
        const { count: feedbacksPendentes } = await supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .gte('criado_em', dataLimite.toISOString())
          .in('status', ['ABERTO', 'EM_ANALISE']);

        // Notificações não lidas
        const { count: notificacoesNaoLidas } = await supabase
          .from('notificacoes')
          .select('*', { count: 'exact', head: true })
          .eq('lida', false);

        // Projetos em andamento com prazo nos próximos 7 dias
        const dataFutura = new Date();
        dataFutura.setDate(dataFutura.getDate() + 7);
        const { count: projetsVencendo } = await supabase
          .from('projetos')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'EM_ANDAMENTO')
          .lte('prazo', dataFutura.toISOString());

        if (!alive) return;

        setContadores({
          tarefasPendentes: tarefasPendentes ?? 0,
          feedbacksPendentes: feedbacksPendentes ?? 0,
          notificacoesNaoLidas: notificacoesNaoLidas ?? 0,
          projetsVencendo: projetsVencendo ?? 0
        });
      } catch (err) {
        console.error('Erro ao buscar contadores:', err);
        if (!alive) return;
        // mantém undefined para não quebrar hidratação com valores divergentes
        setContadores((prev) => ({ ...prev }));
      } finally {
        fetchingRef.current = false;
      }
    }

    // primeira carga + polling
    fetchContadores();
    const interval = setInterval(fetchContadores, 5 * 60 * 1000);

    // realtime: escuta mudanças relevantes e revalida
    const chan = supabase
      .channel('sidebar-counters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, fetchContadores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, fetchContadores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, fetchContadores)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projetos' }, fetchContadores)
      .subscribe();

    return () => {
      alive = false;
      clearInterval(interval);
      supabase.removeChannel(chan);
    };
  }, []);

  // sections memoizadas pra evitar recalcular em cada render
  const navigationSections: NavSection[] = useMemo(() => ([
    {
      title: 'Principal',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: Home },
        { title: 'Projetos', href: '/projetos', icon: FolderOpen, badge: contadores.projetsVencendo },
        { title: 'Artes', href: '/artes', icon: FileImage },
        { title: 'Tarefas', href: '/tarefas', icon: CheckSquare, badge: contadores.tarefasPendentes }
      ]
    },
    {
      title: 'Gestão',
      items: [
        { title: 'Clientes', href: '/clientes', icon: Users },
        { title: 'Feedbacks', href: '/feedbacks', icon: MessageSquare, badge: contadores.feedbacksPendentes },
        { title: 'Notificações', href: '/notificacoes', icon: Bell, badge: contadores.notificacoesNaoLidas }
      ]
    },
    {
      title: 'Relatórios',
      collapsible: true,
      items: [
        { title: 'Status do sistema', href: '/status', icon: BarChart3 },
        { title: 'Prazos', href: '/relatorios/prazos', icon: Clock }
      ]
    },
    {
      title: 'Configurações',
      collapsible: true,
      items: [
        { title: 'Perfil', href: '/perfil', icon: User },
        { title: 'Links Compartilhados', href: '/links', icon: LinkIcon },
        { title: 'Configurações', href: '/configuracoes', icon: Settings }
      ]
    }
  ]), [
    contadores.tarefasPendentes,
    contadores.feedbacksPendentes,
    contadores.notificacoesNaoLidas,
    contadores.projetsVencendo
  ]);

  const toggleSection = (sectionTitle: string) => {
    setSectionsCollapsed(prev => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  };

  return (
    <div className="flex h-full w-64 flex-col bg-background border-r">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-lg font-semibold">VIU</h2>
        <p className="text-sm text-muted-foreground">Gestão de Projetos</p>
      </div>

      <Separator className="my-4" />

      {/* Navegação */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-6">
          {navigationSections.map((section) => {
            const isCollapsed = sectionsCollapsed[section.title];
            const showItems = !section.collapsible || !isCollapsed;

            return (
              <div key={section.title}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                  {section.collapsible && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleSection(section.title)}
                      aria-label={isCollapsed ? "Expandir seção" : "Recolher seção"}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {showItems && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                            item.disabled && "pointer-events-none opacity-50"
                          )}
                          suppressHydrationWarning
                        >
                          <div className="flex items-center">
                            <Icon className="mr-3 h-4 w-4" />
                            {item.title}
                          </div>
                          {renderBadge(item.badge)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Rodapé (usuario) */}
      <SidebarUser />
    </div>
  );
}

// footer isolado (pode futuramente ler usuário real)
function SidebarUser() {
  const [email, setEmail] = useState<string>('—');
  const [nome, setNome] = useState<string>('—');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!alive) return;
      setEmail(u?.email ?? '—');
      // Se você tiver tabela de perfis/usuarios, pode buscar o nome aqui.
      setNome((u?.user_metadata as any)?.name ?? 'Usuário');
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="p-4 border-t">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{nome}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
      </div>
    </div>
  );
}
