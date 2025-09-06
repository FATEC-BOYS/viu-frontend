'use client';

import { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Bell,
  Shield,
  Database,
  Palette,
  Monitor,
  Save,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Lock,
  Mail,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

// Tipos de configurações
interface ConfiguracoesSistema {
  tema: string;
  idioma: string;
  timezone: string;
  notificacoesPush: boolean;
  notificacoesEmail: boolean;
  notificacoesSms: boolean;
  emailDigest: string;
  autoSave: boolean;
  qualidadeImagem: string;
  formatoPadrao: string;
  backupAutomatico: boolean;
  retencaoDados: number;
  compartilhamentoPadrao: string;
  visibilidadePerfil: string;
  analiticsEnabled: boolean;
}

// Componente de Seção de Configuração
function ConfigSection({ title, description, icon: Icon, children }: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}

// Componente de Toggle de Configuração
function ConfigToggle({ label, description, checked, onCheckedChange, disabled = false }: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

// Componente Principal
export default function ConfiguracoesPage() {
  const [configs, setConfigs] = useState<ConfiguracoesSistema>({
    tema: 'claro',
    idioma: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    notificacoesPush: true,
    notificacoesEmail: true,
    notificacoesSms: false,
    emailDigest: 'diario',
    autoSave: true,
    qualidadeImagem: 'alta',
    formatoPadrao: 'PNG',
    backupAutomatico: true,
    retencaoDados: 365,
    compartilhamentoPadrao: 'somente_leitura',
    visibilidadePerfil: 'publico',
    analiticsEnabled: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Salvar configurações
  const handleSave = async () => {
    setSaving(true);
    try {
      // Aqui você salvaria as configurações no banco ou localStorage
      // await salvarConfiguracoes(configs);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Configurações salvas:', configs);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
    }
  };

  // Resetar para padrões
  const handleReset = async () => {
    setLoading(true);
    try {
      const defaultConfigs: ConfiguracoesSistema = {
        tema: 'claro',
        idioma: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        notificacoesPush: true,
        notificacoesEmail: true,
        notificacoesSms: false,
        emailDigest: 'diario',
        autoSave: true,
        qualidadeImagem: 'alta',
        formatoPadrao: 'PNG',
        backupAutomatico: true,
        retencaoDados: 365,
        compartilhamentoPadrao: 'somente_leitura',
        visibilidadePerfil: 'publico',
        analiticsEnabled: true,
      };
      
      setConfigs(defaultConfigs);
      setShowResetDialog(false);
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  // Exportar dados
  const handleExport = async () => {
    try {
      // Simular export de dados
      const dadosExport = {
        configuracoes: configs,
        dataExport: new Date().toISOString(),
        versao: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(dadosExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `configuracoes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize sua experiência e configure o sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Grid de Configurações */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Aparência */}
        <ConfigSection
          title="Aparência"
          description="Customize a aparência da interface"
          icon={Palette}
        >
          <div className="space-y-4">
            <div>
              <Label>Tema</Label>
              <Select value={configs.tema} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, tema: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claro">Claro</SelectItem>
                  <SelectItem value="escuro">Escuro</SelectItem>
                  <SelectItem value="automatico">Automático</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Idioma</Label>
              <Select value={configs.idioma} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, idioma: value }))
              }>
                <SelectTrigger className="mt-1">
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
              <Label>Fuso Horário</Label>
              <Select value={configs.timezone} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, timezone: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                  <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ConfigSection>

        {/* Notificações */}
        <ConfigSection
          title="Notificações"
          description="Configure como receber notificações"
          icon={Bell}
        >
          <div className="space-y-4">
            <ConfigToggle
              label="Notificações Push"
              description="Receba notificações no navegador"
              checked={configs.notificacoesPush}
              onCheckedChange={(checked) => 
                setConfigs(prev => ({ ...prev, notificacoesPush: checked }))
              }
            />
            
            <ConfigToggle
              label="Notificações por Email"
              description="Receba atualizações importantes por email"
              checked={configs.notificacoesEmail}
              onCheckedChange={(checked) => 
                setConfigs(prev => ({ ...prev, notificacoesEmail: checked }))
              }
            />
            
            <ConfigToggle
              label="Notificações SMS"
              description="Receba alertas críticos via SMS"
              checked={configs.notificacoesSms}
              onCheckedChange={(checked) => 
                setConfigs(prev => ({ ...prev, notificacoesSms: checked }))
              }
            />

            <div>
              <Label>Resumo por Email</Label>
              <Select value={configs.emailDigest} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, emailDigest: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nunca">Nunca</SelectItem>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ConfigSection>

        {/* Sistema */}
        <ConfigSection
          title="Sistema"
          description="Configurações de funcionamento do sistema"
          icon={Monitor}
        >
          <div className="space-y-4">
            <ConfigToggle
              label="Salvamento Automático"
              description="Salve automaticamente suas alterações"
              checked={configs.autoSave}
              onCheckedChange={(checked) => 
                setConfigs(prev => ({ ...prev, autoSave: checked }))
              }
            />

            <ConfigToggle
              label="Backup Automático"
              description="Faça backup dos seus dados automaticamente"
              checked={configs.backupAutomatico}
              onCheckedChange={(checked) => 
                setConfigs(prev => ({ ...prev, backupAutomatico: checked }))
              }
            />

            <div>
              <Label>Qualidade de Imagem</Label>
              <Select value={configs.qualidadeImagem} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, qualidadeImagem: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="original">Original</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Formato Padrão de Export</Label>
              <Select value={configs.formatoPadrao} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, formatoPadrao: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNG">PNG</SelectItem>
                  <SelectItem value="JPG">JPG</SelectItem>
                  <SelectItem value="SVG">SVG</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ConfigSection>

        {/* Privacidade & Segurança */}
        <ConfigSection
          title="Privacidade & Segurança"
          description="Configure suas preferências de privacidade"
          icon={Shield}
        >
          <div className="space-y-4">
            <div>
              <Label>Visibilidade do Perfil</Label>
              <Select value={configs.visibilidadePerfil} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, visibilidadePerfil: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publico">Público</SelectItem>
                  <SelectItem value="privado">Privado</SelectItem>
                  <SelectItem value="equipe">Apenas Equipe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Compartilhamento Padrão</Label>
              <Select value={configs.compartilhamentoPadrao} onValueChange={(value) => 
                setConfigs(prev => ({ ...prev, compartilhamentoPadrao: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="somente_leitura">Somente Leitura</SelectItem>
                  <SelectItem value="comentarios">Permitir Comentários</SelectItem>
                  <SelectItem value="edicao">Permitir Edição</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ConfigToggle
              label="Analytics"
              description="Permitir coleta de dados para melhorar o sistema"
              checked={configs.analiticsEnabled}
              onCheckedChange={(checked) => 
                setConfigs(prev => ({ ...prev, analiticsEnabled: checked }))
              }
            />

            <div>
              <Label>Retenção de Dados (dias)</Label>
              <Input
                type="number"
                value={configs.retencaoDados}
                onChange={(e) => 
                  setConfigs(prev => ({ ...prev, retencaoDados: parseInt(e.target.value) || 365 }))
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dados serão automaticamente removidos após este período
              </p>
            </div>
          </div>
        </ConfigSection>
      </div>

      {/* Ações Perigosas */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ações irreversíveis que afetam permanentemente seus dados
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Resetar Configurações</h4>
              <p className="text-sm text-muted-foreground">
                Voltar todas as configurações para os valores padrão
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowResetDialog(true)}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-destructive">Excluir Todos os Dados</h4>
              <p className="text-sm text-muted-foreground">
                Remove permanentemente todos os seus dados do sistema
              </p>
            </div>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Reset */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Configurações</DialogTitle>
            <DialogDescription>
              Esta ação irá reverter todas as configurações para os valores padrão. 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReset} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Resetar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Export */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Configurações</DialogTitle>
            <DialogDescription>
              Baixe um arquivo com todas as suas configurações atuais. 
              Você pode usar este arquivo para restaurar suas configurações posteriormente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}