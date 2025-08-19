import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/Navbar" 
import { 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Globe, 
  Smartphone,
  Mail,
  Eye,
  EyeOff,
  Upload,
  Save,
  Trash2,
  Shield,
  Key,
  Clock,
  Moon,
  Sun,
  Monitor,
  Camera,
  Settings as SettingsIcon,
  Languages,
  Zap,
  CreditCard,
  LogOut,
  Download,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  bio: string;
  avatar: string;
  website: string;
  location: string;
  timezone: string;
  language: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  projectUpdates: boolean;
  feedbackRequests: boolean;
  deadlineReminders: boolean;
  teamActivity: boolean;
  marketingEmails: boolean;
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'clients-only';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  dataCollection: boolean;
  analyticsTracking: boolean;
  thirdPartyIntegrations: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  compactMode: boolean;
}

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile>({
    id: "1",
    name: "Ana Silva",
    email: "ana@designer.com",
    phone: "+55 11 99999-9999",
    company: "Design Studio",
    position: "Designer Sênior",
    bio: "Designer especializada em branding e identidade visual com mais de 8 anos de experiência.",
    avatar: "",
    website: "https://anasilva.design",
    location: "São Paulo, SP",
    timezone: "America/Sao_Paulo",
    language: "pt-BR",
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    desktopNotifications: false,
    soundEnabled: true,
    projectUpdates: true,
    feedbackRequests: true,
    deadlineReminders: true,
    teamActivity: false,
    marketingEmails: false,
    digestFrequency: 'daily',
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "08:00",
    },
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'clients-only',
    showOnlineStatus: true,
    allowDirectMessages: true,
    dataCollection: true,
    analyticsTracking: false,
    thirdPartyIntegrations: true,
  });

  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'system',
    accentColor: '#8B5CF6',
    language: 'pt-BR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    currency: 'BRL',
    compactMode: false,
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [activeTab, setActiveTab] = useState("profile");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleProfileUpdate = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleNotificationUpdate = (field: keyof NotificationSettings, value: any) => {
    setNotifications(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handlePrivacyUpdate = (field: keyof PrivacySettings, value: any) => {
    setPrivacy(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleAppearanceUpdate = (field: keyof AppearanceSettings, value: any) => {
    setAppearance(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    // In a real app, this would save to the backend
    console.log("Saving changes...", { profile, notifications, privacy, appearance });
    setHasUnsavedChanges(false);
    
    // Simulate API call
    setTimeout(() => {
      alert("Configurações salvas com sucesso!");
    }, 500);
  };

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      alert("As senhas não coincidem!");
      return;
    }
    
    if (passwords.new.length < 8) {
      alert("A nova senha deve ter pelo menos 8 caracteres!");
      return;
    }

    // In a real app, this would call the backend
    console.log("Changing password...");
    alert("Senha alterada com sucesso!");
    setPasswords({ current: "", new: "", confirm: "" });
  };

  const handleDeleteAccount = () => {
    if (confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.")) {
      console.log("Deleting account...");
      alert("Conta excluída com sucesso!");
    }
  };

  const handleExportData = () => {
    console.log("Exporting user data...");
    alert("Seus dados serão exportados e enviados por e-mail em alguns minutos.");
  };

  const accentColors = [
    { name: "Roxo", value: "#8B5CF6" },
    { name: "Azul", value: "#3B82F6" },
    { name: "Verde", value: "#10B981" },
    { name: "Rosa", value: "#EC4899" },
    { name: "Laranja", value: "#F59E0B" },
    { name: "Vermelho", value: "#EF4444" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
        <Navbar status="authenticated" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie seu perfil, preferências e configurações de privacidade
            </p>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 mt-4 lg:mt-0">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Alterações não salvas
              </Badge>
              <Button onClick={handleSaveChanges} className="bg-gradient-primary hover:opacity-90">
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4 mr-2" />
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 mr-2" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="w-4 h-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Avançado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Photo */}
            <Card>
              <CardHeader>
                <CardTitle>Foto do Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="text-lg">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-x-2">
                    <Button variant="outline">
                      <Camera className="w-4 h-4 mr-2" />
                      Alterar Foto
                    </Button>
                    <Button variant="ghost">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => handleProfileUpdate('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleProfileUpdate('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => handleProfileUpdate('phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profile.website}
                      onChange={(e) => handleProfileUpdate('website', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={profile.company}
                      onChange={(e) => handleProfileUpdate('company', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Cargo</Label>
                    <Input
                      id="position"
                      value={profile.position}
                      onChange={(e) => handleProfileUpdate('position', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Localização</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => handleProfileUpdate('location', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select 
                      value={profile.timezone} 
                      onValueChange={(value) => handleProfileUpdate('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {/* General Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Notificações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Notificações por E-mail</label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações importantes por e-mail
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationUpdate('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Notificações Push</label>
                    <p className="text-sm text-muted-foreground">
                      Notificações instantâneas no navegador
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => handleNotificationUpdate('pushNotifications', checked)}
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
                    checked={notifications.desktopNotifications}
                    onCheckedChange={(checked) => handleNotificationUpdate('desktopNotifications', checked)}
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
                    checked={notifications.soundEnabled}
                    onCheckedChange={(checked) => handleNotificationUpdate('soundEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Specific Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Notificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Atualizações de Projetos</label>
                    <p className="text-sm text-muted-foreground">
                      Quando houver mudanças nos seus projetos
                    </p>
                  </div>
                  <Switch
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) => handleNotificationUpdate('projectUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Solicitações de Feedback</label>
                    <p className="text-sm text-muted-foreground">
                      Quando clientes solicitarem aprovações
                    </p>
                  </div>
                  <Switch
                    checked={notifications.feedbackRequests}
                    onCheckedChange={(checked) => handleNotificationUpdate('feedbackRequests', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Lembretes de Prazo</label>
                    <p className="text-sm text-muted-foreground">
                      Avisos sobre prazos próximos ao vencimento
                    </p>
                  </div>
                  <Switch
                    checked={notifications.deadlineReminders}
                    onCheckedChange={(checked) => handleNotificationUpdate('deadlineReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Atividades da Equipe</label>
                    <p className="text-sm text-muted-foreground">
                      Quando membros da equipe fizerem alterações
                    </p>
                  </div>
                  <Switch
                    checked={notifications.teamActivity}
                    onCheckedChange={(checked) => handleNotificationUpdate('teamActivity', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quiet Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Horário Silencioso</CardTitle>
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
                    checked={notifications.quietHours.enabled}
                    onCheckedChange={(checked) => 
                      handleNotificationUpdate('quietHours', { ...notifications.quietHours, enabled: checked })
                    }
                  />
                </div>

                {notifications.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quiet-start">Início</Label>
                      <input
                        id="quiet-start"
                        type="time"
                        value={notifications.quietHours.start}
                        onChange={(e) => 
                          handleNotificationUpdate('quietHours', { 
                            ...notifications.quietHours, 
                            start: e.target.value 
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiet-end">Fim</Label>
                      <input
                        id="quiet-end"
                        type="time"
                        value={notifications.quietHours.end}
                        onChange={(e) => 
                          handleNotificationUpdate('quietHours', { 
                            ...notifications.quietHours, 
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
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            {/* Profile Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>Privacidade do Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="profile-visibility">Visibilidade do Perfil</Label>
                  <Select 
                    value={privacy.profileVisibility} 
                    onValueChange={(value: any) => handlePrivacyUpdate('profileVisibility', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="clients-only">Apenas Clientes</SelectItem>
                      <SelectItem value="private">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Controle quem pode ver suas informações de perfil
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Mostrar Status Online</label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que outros vejam quando você está online
                    </p>
                  </div>
                  <Switch
                    checked={privacy.showOnlineStatus}
                    onCheckedChange={(checked) => handlePrivacyUpdate('showOnlineStatus', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Permitir Mensagens Diretas</label>
                    <p className="text-sm text-muted-foreground">
                      Clientes podem enviar mensagens diretas
                    </p>
                  </div>
                  <Switch
                    checked={privacy.allowDirectMessages}
                    onCheckedChange={(checked) => handlePrivacyUpdate('allowDirectMessages', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Data Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>Privacidade de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Coleta de Dados</label>
                    <p className="text-sm text-muted-foreground">
                      Permitir coleta de dados para melhorar a experiência
                    </p>
                  </div>
                  <Switch
                    checked={privacy.dataCollection}
                    onCheckedChange={(checked) => handlePrivacyUpdate('dataCollection', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Rastreamento de Analytics</label>
                    <p className="text-sm text-muted-foreground">
                      Enviar dados de uso anônimos para análise
                    </p>
                  </div>
                  <Switch
                    checked={privacy.analyticsTracking}
                    onCheckedChange={(checked) => handlePrivacyUpdate('analyticsTracking', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Integrações de Terceiros</label>
                    <p className="text-sm text-muted-foreground">
                      Permitir conexões com serviços externos
                    </p>
                  </div>
                  <Switch
                    checked={privacy.thirdPartyIntegrations}
                    onCheckedChange={(checked) => handlePrivacyUpdate('thirdPartyIntegrations', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            {/* Theme */}
            <Card>
              <CardHeader>
                <CardTitle>Tema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', label: 'Claro', icon: Sun },
                    { value: 'dark', label: 'Escuro', icon: Moon },
                    { value: 'system', label: 'Sistema', icon: Monitor },
                  ].map((theme) => (
                    <Button
                      key={theme.value}
                      variant={appearance.theme === theme.value ? "default" : "outline"}
                      onClick={() => handleAppearanceUpdate('theme', theme.value)}
                      className="h-20 flex flex-col"
                    >
                      <theme.icon className="w-6 h-6 mb-2" />
                      {theme.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Accent Color */}
            <Card>
              <CardHeader>
                <CardTitle>Cor de Destaque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-3">
                  {accentColors.map((color) => (
                    <Button
                      key={color.value}
                      variant="outline"
                      onClick={() => handleAppearanceUpdate('accentColor', color.value)}
                      className={cn(
                        "h-12 p-0",
                        appearance.accentColor === color.value && "ring-2 ring-offset-2 ring-primary"
                      )}
                    >
                      <div
                        className="w-full h-full rounded"
                        style={{ backgroundColor: color.value }}
                      />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Localization */}
            <Card>
              <CardHeader>
                <CardTitle>Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Idioma</Label>
                    <Select 
                      value={appearance.language} 
                      onValueChange={(value) => handleAppearanceUpdate('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency">Moeda</Label>
                    <Select 
                      value={appearance.currency} 
                      onValueChange={(value) => handleAppearanceUpdate('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                        <SelectItem value="USD">Dólar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date-format">Formato de Data</Label>
                    <Select 
                      value={appearance.dateFormat} 
                      onValueChange={(value) => handleAppearanceUpdate('dateFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                        <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="time-format">Formato de Hora</Label>
                    <Select 
                      value={appearance.timeFormat} 
                      onValueChange={(value: any) => handleAppearanceUpdate('timeFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 horas</SelectItem>
                        <SelectItem value="12h">12 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Modo Compacto</label>
                    <p className="text-sm text-muted-foreground">
                      Interface mais densa com menos espaçamento
                    </p>
                  </div>
                  <Switch
                    checked={appearance.compactMode}
                    onCheckedChange={(checked) => handleAppearanceUpdate('compactMode', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={passwords.new}
                      onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={handleChangePassword}
                  disabled={!passwords.current || !passwords.new || !passwords.confirm}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Autenticação de Dois Fatores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">2FA não configurado</p>
                    <p className="text-sm text-muted-foreground">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                  </div>
                  <Button variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    Configurar 2FA
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Sessões Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <Monitor className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Navegador atual</p>
                        <p className="text-sm text-muted-foreground">São Paulo, SP • Agora</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Atual
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">iPhone 13</p>
                        <p className="text-sm text-muted-foreground">São Paulo, SP • 2 horas atrás</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle>Exportar Dados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Baixar seus dados</p>
                    <p className="text-sm text-muted-foreground">
                      Exporte todos os seus dados em formato JSON
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Dados
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Management */}
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Desativar Conta</p>
                    <p className="text-sm text-muted-foreground">
                      Temporariamente desabilitar sua conta
                    </p>
                  </div>
                  <Button variant="outline">
                    Desativar
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Excluir Conta</p>
                      <p className="text-sm text-muted-foreground">
                        Excluir permanentemente sua conta e todos os dados
                      </p>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Conta
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Access */}
            <Card>
              <CardHeader>
                <CardTitle>Acesso à API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Chaves de API</p>
                    <p className="text-sm text-muted-foreground">
                      Gerencie suas chaves para integração com a API
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      value="sk_live_••••••••••••••••••••••••••••"
                      readOnly
                      className="font-mono"
                    />
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Key className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Chave de API
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
