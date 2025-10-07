'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  BarChart3, Clock, Settings, User, Link as LinkIcon, ChevronDown, ChevronRight,
  ChevronLeft, PanelRightClose, PanelLeftOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// ✅ Tooltip do shadcn (se não tiver, me avisa que troco por title nativo)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// --- helpers ---------------------------------------------------------------

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

// localStorage seguro (SSR)
function useLocalStorageBoolean(key: string, initial = false) {
  const mounted = useMounted();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw === 'true' || raw === 'false') setValue(raw === 'true');
    } catch {}
  }, [key, mounted]);

  const update = useCallback((v: boolean) => {
    setValue(v);
    try { localStorage.setItem(key, String(v)); } catch {}
  }, [key]);

  return [value, update] as const;
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

  const [collapsed, setCollapsed] = useLocalStorageBoolean('viu.sidebar.collapsed', false);
  const [contadores, setContadores] = useState<Contadores>({
    tarefasPendentes: undefined,
    feedbacksPendentes: undefined,
    notificacoesNaoLidas: undefined,
    projetsVencendo: undefined
  });

  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});
  const fetchingRef = useRef(false);

  // Toggle via botão e via atalho
  const toggleCollapsed = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

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
        await supabase.auth.getUser();

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
        setContadores((prev) => ({ ...prev }));
      } finally {
        fetchingRef.current = false;
      }
    }

    fetchContadores();
    const interval = setInterval(fetchContadores, 5 * 60 * 1000);

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

  // sections memoizadas
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
        { title: 'Prazos', href: '/prazos', icon: Clock }
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
    <TooltipProvider delayDuration={50}>
      <div
        className={cn(
          "group/sidebar flex h-full flex-col border-r bg-background transition-[width] duration-300 ease-out",
          collapsed ? "w-16" : "w-64"
        )}
        aria-label="Barra lateral de navegação"
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between p-3", collapsed && "justify-center")}>
          <div className={cn("flex items-center gap-2", collapsed && "hidden")}>
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">VIU</h2>
              <p className="text-xs text-muted-foreground">Gestão de Projetos</p>
            </div>
          </div>

        {/* Botão de colapsar/expandir */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expandir navegação (Ctrl/Cmd+B)" : "Recolher navegação (Ctrl/Cmd+B)"}
                aria-pressed={collapsed}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>{collapsed ? 'Expandir' : 'Recolher'} (Ctrl/Cmd + B)</span>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator className="my-2" />

        {/* Navegação */}
        <ScrollArea className="flex-1 px-2">
          <nav className="space-y-5">
            {navigationSections.map((section) => {
              const isCollapsedSection = sectionsCollapsed[section.title];
              const showItems = !section.collapsible || !isCollapsedSection;

              return (
                <div key={section.title}>
                  {/* Header da seção */}
                  <div className={cn(
                    "mb-1 flex items-center justify-between px-2",
                    collapsed && "justify-center"
                  )}>
                    {!collapsed && (
                      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {section.title}
                      </h3>
                    )}

                    {section.collapsible && !collapsed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleSection(section.title)}
                        aria-label={isCollapsedSection ? "Expandir seção" : "Recolher seção"}
                      >
                        {isCollapsedSection ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {/* separador visual no modo compacto */}
                    {collapsed && <div className="h-px w-8 bg-border" />}
                  </div>

                  {/* Itens */}
                  {showItems && (
                    <div className={cn("space-y-1", collapsed && "space-y-2")}>
                      {section.items.map((item) => (
                        <NavItemRow
                          key={item.href}
                          item={item}
                          active={isActive(item.href)}
                          collapsed={collapsed}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Rodapé (usuario) */}
        <SidebarUser collapsed={collapsed} />
      </div>
    </TooltipProvider>
  );
}

// --- Item isolado ----------------------------------------------------------

function NavItemRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      className={cn(
        "group/item relative flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors outline-none",
        "hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        item.disabled && "pointer-events-none opacity-50"
      )}
      aria-current={active ? 'page' : undefined}
    >
      {/* Indicador de ativo (borda à esquerda) */}
      <span
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r",
          active ? "bg-primary" : "bg-transparent"
        )}
        aria-hidden
      />

      <Icon className={cn("h-4 w-4", collapsed ? "mx-auto" : "mr-3")} />

      {/* Título + badge (somem no compacto) */}
      {!collapsed && (
        <div className="ml-1 flex w-full items-center justify-between">
          <span>{item.title}</span>
          {renderBadge(item.badge)}
        </div>
      )}
    </Link>
  );

  // No modo compacto, envolvemos no Tooltip para mostrar o título e o badge
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span className="font-medium">{item.title}</span>
          {renderBadge(item.badge)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// --- footer isolado --------------------------------------------------------

function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const [email, setEmail] = useState<string>('—');
  const [nome, setNome] = useState<string>('—');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (!alive) return;
      setEmail(u?.email ?? '—');
      setNome((u?.user_metadata as any)?.name ?? 'Usuário');
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className={cn("border-t p-2", collapsed && "p-2")}>
      <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{nome}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        )}
      </div>
    </div>
  );
}
