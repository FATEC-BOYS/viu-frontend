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
  Home, FolderOpen, FileImage, CheckSquare, Users, Users2, MessageSquare, Bell,
  BarChart3, Clock, Settings, User, Link as LinkIcon, ChevronDown, ChevronRight,
  ChevronLeft, PanelRightClose, PanelLeftOpen, Monitor,
  CreditCard, Wallet, Receipt, ArrowDownToLine, Scale, ShieldCheck, MailOpen
} from 'lucide-react';
import { api } from '@/lib/api';
import { convitesApi, convitesEquipeApi } from '@/lib/convites';
import { useAuth } from '@/contexts/AuthContext';

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
  convitesPendentes: MaybeNumber;
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
    projetsVencendo: undefined,
    convitesPendentes: undefined
  });

  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});
  const fetchingRef = useRef(false);
  const { user } = useAuth();
  const ehAdmin = user?.tipo === 'ADMIN';

  const toggleCollapsed = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    let alive = true;

    async function fetchContadores() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const [resPendentes, resEmAndamento, resFeedbacks, resNotificacoes, resProjetos, resConvites, resConvitesEquipe] = await Promise.allSettled([
          api.get<{ pagination: { total: number } }>('/tarefas?status=PENDENTE&limit=1'),
          api.get<{ pagination: { total: number } }>('/tarefas?status=EM_ANDAMENTO&limit=1'),
          api.get<{ pagination: { total: number } }>('/feedbacks?limit=1'),
          api.get<{ pagination: { total: number } }>('/notificacoes?lida=false&limit=1'),
          api.get<{ pagination: { total: number } }>('/projetos?status=EM_ANDAMENTO&limit=1'),
          // Convites não são paginados: o backend devolve só os pendentes.
          convitesApi.listarPendentes(),
          convitesEquipeApi.listarPendentes(),
        ]);

        if (!alive) return;

        const total = (r: PromiseSettledResult<{ pagination: { total: number } }>) =>
          r.status === 'fulfilled' ? (r.value.pagination?.total ?? 0) : 0;

        const quantidade = (r: PromiseSettledResult<unknown[]>) =>
          r.status === 'fulfilled' ? r.value.length : 0;

        setContadores({
          tarefasPendentes: total(resPendentes) + total(resEmAndamento),
          feedbacksPendentes: total(resFeedbacks),
          notificacoesNaoLidas: total(resNotificacoes),
          projetsVencendo: total(resProjetos),
          convitesPendentes: quantidade(resConvites) + quantidade(resConvitesEquipe),
        });
      } catch (err) {
        console.error('Erro ao buscar contadores:', err);
      } finally {
        fetchingRef.current = false;
      }
    }

    fetchContadores();
    const interval = setInterval(fetchContadores, 5 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

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
        { title: 'Equipes', href: '/equipes', icon: Users2 },
        { title: 'Feedbacks', href: '/feedbacks', icon: MessageSquare, badge: contadores.feedbacksPendentes },
        { title: 'Notificações', href: '/notificacoes', icon: Bell, badge: contadores.notificacoesNaoLidas },
        { title: 'Convites', href: '/convites', icon: MailOpen, badge: contadores.convitesPendentes }
      ]
    },
    {
      title: 'Financeiro',
      collapsible: true,
      items: [
        { title: 'Planos', href: '/planos', icon: CreditCard },
        { title: 'Assinatura', href: '/assinaturas', icon: Wallet },
        { title: 'Faturas', href: '/faturas', icon: Receipt },
        { title: 'Saques', href: '/saques', icon: ArrowDownToLine },
        { title: 'Disputas', href: '/disputas', icon: Scale },
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
        { title: 'Sessões', href: '/sessoes', icon: Monitor },
        { title: 'Links Compartilhados', href: '/links', icon: LinkIcon },
        { title: 'Configurações', href: '/configuracoes', icon: Settings }
      ]
    },
    // Esconder o menu é só para não poluir a navegação de quem não usa: o
    // backend continua devolvendo 403 nessas rotas para quem não é ADMIN.
    ...(ehAdmin ? [{
      title: 'Administração',
      collapsible: true,
      items: [
        { title: 'Saques', href: '/admin/saques', icon: ArrowDownToLine },
        { title: 'Usuários', href: '/admin/usuarios', icon: ShieldCheck },
      ]
    }] : [])
  ]), [
    ehAdmin,
    contadores.tarefasPendentes,
    contadores.feedbacksPendentes,
    contadores.notificacoesNaoLidas,
    contadores.projetsVencendo,
    contadores.convitesPendentes
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

                    {collapsed && <div className="h-px w-8 bg-border" />}
                  </div>

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

        {/* Rodapé */}
        <SidebarUser collapsed={collapsed} />
      </div>
    </TooltipProvider>
  );
}

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
      <span
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r",
          active ? "bg-primary" : "bg-transparent"
        )}
        aria-hidden
      />

      <Icon className={cn("h-4 w-4", collapsed ? "mx-auto" : "mr-3")} />

      {!collapsed && (
        <div className="ml-1 flex w-full items-center justify-between">
          <span>{item.title}</span>
          {renderBadge(item.badge)}
        </div>
      )}
    </Link>
  );

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

function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const nome = user?.nome ?? 'Usuário';
  const email = user?.email ?? '—';

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
