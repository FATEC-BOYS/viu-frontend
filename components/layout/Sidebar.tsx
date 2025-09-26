// components/layout/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
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
  BarChart3, Clock, Settings, User, Link as LinkIcon, Plus, Upload,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// pequeno hook para garantir que só aplicamos classes dinâmicas após montar
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

interface Contadores {
  tarefasPendentes: number;
  feedbacksPendentes: number;
  notificacoesNaoLidas: number;
  projetsVencendo: number;
}
interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  disabled?: boolean;
}
interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const mounted = useMounted();

  const [contadores, setContadores] = useState<Contadores>({
    tarefasPendentes: 0,
    feedbacksPendentes: 0,
    notificacoesNaoLidas: 0,
    projetsVencendo: 0
  });
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchContadores = async () => {
      try {
        const { count: tarefasPendentes } = await supabase
          .from('tarefas')
          .select('*', { count: 'exact', head: true })
          .in('status', ['PENDENTE', 'EM_ANDAMENTO']);

        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 7);
        const { count: feedbacksPendentes } = await supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .gte('criado_em', dataLimite.toISOString());

        const { count: notificacoesNaoLidas } = await supabase
          .from('notificacoes')
          .select('*', { count: 'exact', head: true })
          .eq('lida', false);

        const dataFutura = new Date();
        dataFutura.setDate(dataFutura.getDate() + 7);
        const { count: projetsVencendo } = await supabase
          .from('projetos')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'EM_ANDAMENTO')
          .lte('prazo', dataFutura.toISOString());

        setContadores({
          tarefasPendentes: tarefasPendentes || 0,
          feedbacksPendentes: feedbacksPendentes || 0,
          notificacoesNaoLidas: notificacoesNaoLidas || 0,
          projetsVencendo: projetsVencendo || 0
        });
      } catch (error) {
        console.error('Erro ao buscar contadores:', error);
      }
    };

    fetchContadores();
    const interval = setInterval(fetchContadores, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const navigationSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: Home },
        { title: 'Projetos', href: '/projetos', icon: FolderOpen, badge: contadores.projetsVencendo || undefined },
        { title: 'Artes', href: '/artes', icon: FileImage },
        { title: 'Tarefas', href: '/tarefas', icon: CheckSquare, badge: contadores.tarefasPendentes || undefined }
      ]
    },
    {
      title: 'Gestão',
      items: [
        { title: 'Clientes', href: '/clientes', icon: Users },
        { title: 'Feedbacks', href: '/feedbacks', icon: MessageSquare, badge: contadores.feedbacksPendentes || undefined },
        { title: 'Notificações', href: '/notificacoes', icon: Bell, badge: contadores.notificacoesNaoLidas || undefined }
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
  ];

  const toggleSection = (sectionTitle: string) => {
    setSectionsCollapsed(prev => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  };

  // <<< mudança principal: só consideramos "ativo" DEPOIS de mounted >>>
  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full w-64 flex-col bg-background border-r">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-lg font-semibold">VIU</h2>
        <p className="text-sm text-muted-foreground">Gestão de Projetos</p>
      </div>

      {/* Ações Rápidas
      <div className="px-4 space-y-2">
        <Button className="w-full justify-start" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
        <Button variant="outline" className="w-full justify-start" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload Arte
        </Button>
      </div> */}

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
                          // evita warning visual isolado caso algo ainda mude após mount
                          suppressHydrationWarning
                        >
                          <div className="flex items-center">
                            <Icon className="mr-3 h-4 w-4" />
                            {item.title}
                          </div>
                          {item.badge && item.badge > 0 && (
                            <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1.5">
                              {item.badge > 99 ? '99+' : item.badge}
                            </Badge>
                          )}
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

      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Designer</p>
            <p className="text-xs text-muted-foreground truncate">
              designer@studio.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
