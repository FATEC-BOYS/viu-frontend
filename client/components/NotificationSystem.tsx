import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  BellRing, 
  Mail, 
  Smartphone, 
  Settings, 
  Check, 
  X,
  Clock,
  MessageSquare,
  FileImage,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  Trash2,
  Archive,
  Filter,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: 'feedback' | 'approval' | 'deadline' | 'message' | 'system' | 'project_update';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  projectId?: number;
  projectName?: string;
  actionUrl?: string;
  actionLabel?: string;
  sender?: string;
  senderRole?: 'designer' | 'client' | 'system';
}

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  emailDigest: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'disabled';
  soundEnabled: boolean;
  desktopNotifications: boolean;
  notificationTypes: {
    feedback: boolean;
    approval: boolean;
    deadline: boolean;
    message: boolean;
    system: boolean;
    project_update: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationSystemProps {
  notifications: Notification[];
  settings: NotificationSettings;
  onMarkAsRead: (notificationIds: number[]) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: number) => void;
  onUpdateSettings: (settings: NotificationSettings) => void;
  onNavigateToAction: (actionUrl: string) => void;
}

export default function NotificationSystem({
  notifications,
  settings,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onUpdateSettings,
  onNavigateToAction
}: NotificationSystemProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Request notification permissions on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notification for new notifications
  useEffect(() => {
    if (settings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
      const latestNotification = notifications
        .filter(n => !n.isRead)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (latestNotification) {
        const notification = new Notification(latestNotification.title, {
          body: latestNotification.message,
          icon: '/placeholder.svg',
          tag: `notification-${latestNotification.id}`,
        });

        notification.onclick = () => {
          if (latestNotification.actionUrl) {
            onNavigateToAction(latestNotification.actionUrl);
          }
          notification.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    }
  }, [notifications, settings.desktopNotifications, onNavigateToAction]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'feedback':
        return MessageSquare;
      case 'approval':
        return CheckCircle;
      case 'deadline':
        return Clock;
      case 'message':
        return MessageSquare;
      case 'system':
        return Settings;
      case 'project_update':
        return FileImage;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (priority: string, isRead: boolean) => {
    if (isRead) return "text-muted-foreground";
    
    switch (priority) {
      case 'high':
        return "text-red-600";
      case 'medium':
        return "text-orange-600";
      case 'low':
        return "text-blue-600";
      default:
        return "text-foreground";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">Média</Badge>;
      case 'low':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">Baixa</Badge>;
      default:
        return null;
    }
  };

  const filteredNotifications = notifications
    .filter(notification => {
      if (filter === 'unread') return !notification.isRead;
      if (filter === 'read') return notification.isRead;
      return true;
    })
    .filter(notification => {
      if (typeFilter === 'all') return true;
      return notification.type === typeFilter;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead([notification.id]);
    }
    
    if (notification.actionUrl) {
      onNavigateToAction(notification.actionUrl);
      setOpen(false);
    }
  };

  const updateSettings = (key: keyof NotificationSettings, value: any) => {
    onUpdateSettings({
      ...settings,
      [key]: value
    });
  };

  const updateNotificationType = (type: keyof NotificationSettings['notificationTypes'], enabled: boolean) => {
    onUpdateSettings({
      ...settings,
      notificationTypes: {
        ...settings.notificationTypes,
        [type]: enabled
      }
    });
  };

  return (
    <div className="relative">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center">
                <BellRing className="w-5 h-5 mr-2" />
                Notificações
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} não lidas
                  </Badge>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <Tabs value={showSettings ? "settings" : "notifications"} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="notifications" 
                onClick={() => setShowSettings(false)}
              >
                Notificações
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                onClick={() => setShowSettings(true)}
              >
                Configurações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="unread">Não lidas</SelectItem>
                      <SelectItem value="read">Lidas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="approval">Aprovação</SelectItem>
                      <SelectItem value="deadline">Prazos</SelectItem>
                      <SelectItem value="message">Mensagens</SelectItem>
                      <SelectItem value="project_update">Projetos</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                      <Check className="w-4 h-4 mr-2" />
                      Marcar todas como lidas
                    </Button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredNotifications.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h4 className="font-semibold mb-2">Nenhuma notificação</h4>
                        <p className="text-muted-foreground">
                          {filter === 'unread' 
                            ? "Você está em dia! Não há notificações não lidas."
                            : "Você não tem notificações no momento."
                          }
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredNotifications.map((notification) => {
                      const IconComponent = getNotificationIcon(notification.type);
                      
                      return (
                        <Card 
                          key={notification.id} 
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            !notification.isRead && "border-l-4 border-l-primary bg-primary/5"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className={cn(
                                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                                notification.isRead ? "bg-muted" : "bg-primary/10"
                              )}>
                                <IconComponent className={cn(
                                  "w-5 h-5",
                                  getNotificationColor(notification.priority, notification.isRead)
                                )} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className={cn(
                                    "font-semibold text-sm",
                                    notification.isRead && "text-muted-foreground"
                                  )}>
                                    {notification.title}
                                  </h4>
                                  <div className="flex items-center space-x-1">
                                    {getPriorityBadge(notification.priority)}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteNotification(notification.id);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>

                                <p className={cn(
                                  "text-sm mb-2",
                                  notification.isRead ? "text-muted-foreground" : "text-foreground"
                                )}>
                                  {notification.message}
                                </p>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <span>
                                      {formatDistanceToNow(new Date(notification.timestamp), { 
                                        addSuffix: true, 
                                        locale: ptBR 
                                      })}
                                    </span>
                                    {notification.projectName && (
                                      <>
                                        <span>•</span>
                                        <span>{notification.projectName}</span>
                                      </>
                                    )}
                                    {notification.sender && (
                                      <>
                                        <span>•</span>
                                        <span>por {notification.sender}</span>
                                      </>
                                    )}
                                  </div>

                                  {notification.actionLabel && (
                                    <Button variant="outline" size="sm">
                                      {notification.actionLabel}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {/* General Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Configurações Gerais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Notificações Push</label>
                          <p className="text-sm text-muted-foreground">
                            Receba notificações em tempo real no navegador
                          </p>
                        </div>
                        <Switch
                          checked={settings.pushNotifications}
                          onCheckedChange={(checked) => updateSettings('pushNotifications', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Notificações Desktop</label>
                          <p className="text-sm text-muted-foreground">
                            Mostrar notificações na área de trabalho
                          </p>
                        </div>
                        <Switch
                          checked={settings.desktopNotifications}
                          onCheckedChange={(checked) => updateSettings('desktopNotifications', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Som das Notificações</label>
                          <p className="text-sm text-muted-foreground">
                            Reproduzir som ao receber notificações
                          </p>
                        </div>
                        <Switch
                          checked={settings.soundEnabled}
                          onCheckedChange={(checked) => updateSettings('soundEnabled', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Email Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Mail className="w-5 h-5 mr-2" />
                        Notificações por E-mail
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">E-mail habilitado</label>
                          <p className="text-sm text-muted-foreground">
                            Receber notificações por e-mail
                          </p>
                        </div>
                        <Switch
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) => updateSettings('emailNotifications', checked)}
                        />
                      </div>

                      {settings.emailNotifications && (
                        <div>
                          <label className="font-medium mb-2 block">Resumo por E-mail</label>
                          <Select 
                            value={settings.emailDigest} 
                            onValueChange={(value) => updateSettings('emailDigest', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Imediato</SelectItem>
                              <SelectItem value="hourly">A cada hora</SelectItem>
                              <SelectItem value="daily">Diário</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="disabled">Desabilitado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notification Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tipos de Notificação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(settings.notificationTypes).map(([type, enabled]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div>
                            <label className="font-medium capitalize">
                              {type === 'project_update' ? 'Atualizações de Projeto' : 
                               type === 'feedback' ? 'Feedback' :
                               type === 'approval' ? 'Aprovações' :
                               type === 'deadline' ? 'Prazos' :
                               type === 'message' ? 'Mensagens' :
                               type === 'system' ? 'Sistema' : type}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {type === 'feedback' && 'Novos feedbacks em suas artes'}
                              {type === 'approval' && 'Solicitações e respostas de aprovação'}
                              {type === 'deadline' && 'Prazos próximos e vencidos'}
                              {type === 'message' && 'Novas mensagens no chat'}
                              {type === 'project_update' && 'Atualizações em projetos'}
                              {type === 'system' && 'Notificações do sistema'}
                            </p>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => updateNotificationType(type as any, checked)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Quiet Hours */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <VolumeX className="w-5 h-5 mr-2" />
                        Horário Silencioso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-medium">Ativar horário silencioso</label>
                          <p className="text-sm text-muted-foreground">
                            Não receber notificações em horários específicos
                          </p>
                        </div>
                        <Switch
                          checked={settings.quietHours.enabled}
                          onCheckedChange={(checked) => 
                            updateSettings('quietHours', { ...settings.quietHours, enabled: checked })
                          }
                        />
                      </div>

                      {settings.quietHours.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Início</label>
                            <input
                              type="time"
                              value={settings.quietHours.start}
                              onChange={(e) => 
                                updateSettings('quietHours', { 
                                  ...settings.quietHours, 
                                  start: e.target.value 
                                })
                              }
                              className="w-full px-3 py-2 border rounded-md"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Fim</label>
                            <input
                              type="time"
                              value={settings.quietHours.end}
                              onChange={(e) => 
                                updateSettings('quietHours', { 
                                  ...settings.quietHours, 
                                  end: e.target.value 
                                })
                              }
                              className="w-full px-3 py-2 border rounded-md"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
