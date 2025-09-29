'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Save, Download, RefreshCw, Trash2, Loader2 } from 'lucide-react';

/** ---------- Tipos ---------- */
interface ConfiguracoesSistema {
  tema: 'claro' | 'escuro' | 'automatico';
  idioma: 'pt-BR' | 'en-US' | 'es-ES';
  timezone: 'America/Sao_Paulo' | 'America/New_York' | 'Europe/London';
  notificacoesPush: boolean;
  notificacoesEmail: boolean;
  notificacoesSms: boolean;
  emailDigest: 'nunca' | 'diario' | 'semanal' | 'mensal';
  autoSave: boolean;
  qualidadeImagem: 'baixa' | 'media' | 'alta' | 'original';
  formatoPadrao: 'PNG' | 'JPG' | 'SVG' | 'PDF';
  backupAutomatico: boolean;
  retencaoDados: number; // dias
  compartilhamentoPadrao: 'somente_leitura' | 'comentarios' | 'edicao';
  visibilidadePerfil: 'publico' | 'privado' | 'equipe';
  analyticsEnabled: boolean;
}
type PrefsRow = { usuario_id: string; prefs: ConfiguracoesSistema; atualizado_em?: string };

const DEFAULT_CONFIGS: ConfiguracoesSistema = {
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
  analyticsEnabled: true,
};

/** ---------- Pequenos componentes ---------- */
function Row({
  label, hint, control,
}: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-center">
      <div>
        <Label className="font-medium">{label}</Label>
        {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
      </div>
      <div className="md:col-span-2">{control}</div>
    </div>
  );
}

function ToggleRow({
  label, hint, checked, onCheckedChange, disabled,
}: {
  label: string; hint?: string; checked: boolean;
  onCheckedChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="font-medium">{label}</Label>
        {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/** ---------- Página ---------- */
export default function ConfiguracoesPage() {
  const [configs, setConfigs] = useState<ConfiguracoesSistema>(DEFAULT_CONFIGS);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  /** Resolve usuario_id e carrega prefs */
  useEffect(() => {
    (async () => {
      try {
        setInitializing(true);
        const { data: auth } = await supabase.auth.getUser();
        const authUserId = auth.user?.id;
        if (!authUserId) throw new Error('Usuário não autenticado');

        const { data: map, error: mapErr } = await supabase
          .from('usuario_auth')
          .select('usuario_id')
          .eq('auth_user_id', authUserId)
          .maybeSingle();
        if (mapErr) throw mapErr;
        if (!map?.usuario_id) throw new Error('usuario_auth não encontrado');

        const uid = map.usuario_id as string;
        setUsuarioId(uid);

        const { data, error } = await supabase
          .from('usuario_prefs')
          .select('usuario_id,prefs,atualizado_em')
          .eq('usuario_id', uid)
          .maybeSingle();

        if (error) throw error;
        if (data?.prefs) setConfigs((p) => ({ ...p, ...data.prefs }));
      } catch (e) {
        console.warn('[Config] usando defaults; motivo:', e);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!usuarioId) return;
    setSaving(true);
    try {
      const row: PrefsRow = {
        usuario_id: usuarioId,
        prefs: configs,
        atualizado_em: new Date().toISOString(),
      };
      const { error } = await supabase.from('usuario_prefs').upsert(row, { onConflict: 'usuario_id' });
      if (error) throw error;
    } catch (e) {
      console.error('[Config] erro ao salvar:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setLoadingReset(true);
    try {
      setConfigs(DEFAULT_CONFIGS);
      if (usuarioId) {
        const row: PrefsRow = {
          usuario_id: usuarioId,
          prefs: DEFAULT_CONFIGS,
          atualizado_em: new Date().toISOString(),
        };
        const { error } = await supabase.from('usuario_prefs').upsert(row, { onConflict: 'usuario_id' });
        if (error) throw error;
      }
      setShowResetDialog(false);
    } catch (e) {
      console.error('[Config] erro ao resetar:', e);
    } finally {
      setLoadingReset(false);
    }
  };

  const handleExport = () => {
    const payload = {
      configuracoes: configs,
      dataExport: new Date().toISOString(),
      versao: '1.0.0',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `configuracoes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {/* Header compacto, alinhado com outras telas */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Ajuste preferências da sua conta e do app</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)} disabled={initializing}>
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || initializing || !usuarioId}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Um único Card com seções e divisores — mais clean */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preferências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Aparência */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Aparência</h3>
            <div className="space-y-4">
              <Row
                label="Tema"
                control={
                  <Select
                    value={configs.tema}
                    onValueChange={(v: ConfiguracoesSistema['tema']) => setConfigs((p) => ({ ...p, tema: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claro">Claro</SelectItem>
                      <SelectItem value="escuro">Escuro</SelectItem>
                      <SelectItem value="automatico">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <Row
                label="Idioma"
                control={
                  <Select
                    value={configs.idioma}
                    onValueChange={(v: ConfiguracoesSistema['idioma']) => setConfigs((p) => ({ ...p, idioma: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <Row
                label="Fuso horário"
                control={
                  <Select
                    value={configs.timezone}
                    onValueChange={(v: ConfiguracoesSistema['timezone']) => setConfigs((p) => ({ ...p, timezone: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </div>
          </section>

          <Separator />

          {/* Notificações */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Notificações</h3>
            <div className="space-y-3">
              <ToggleRow
                label="Notificações push"
                hint="Receba alertas no navegador"
                checked={configs.notificacoesPush}
                onCheckedChange={(v) => setConfigs((p) => ({ ...p, notificacoesPush: v }))}
              />
              <ToggleRow
                label="Notificações por e-mail"
                checked={configs.notificacoesEmail}
                onCheckedChange={(v) => setConfigs((p) => ({ ...p, notificacoesEmail: v }))}
              />
              <ToggleRow
                label="Notificações por SMS"
                checked={configs.notificacoesSms}
                onCheckedChange={(v) => setConfigs((p) => ({ ...p, notificacoesSms: v }))}
              />
              <Row
                label="Resumo por e-mail"
                control={
                  <Select
                    value={configs.emailDigest}
                    onValueChange={(v: ConfiguracoesSistema['emailDigest']) => setConfigs((p) => ({ ...p, emailDigest: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nunca">Nunca</SelectItem>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </div>
          </section>

          <Separator />

          {/* Sistema */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Sistema</h3>
            <div className="space-y-3">
              <ToggleRow
                label="Salvamento automático"
                checked={configs.autoSave}
                onCheckedChange={(v) => setConfigs((p) => ({ ...p, autoSave: v }))}
              />
              <ToggleRow
                label="Backup automático"
                checked={configs.backupAutomatico}
                onCheckedChange={(v) => setConfigs((p) => ({ ...p, backupAutomatico: v }))}
              />
            </div>
            <div className="space-y-4">
              <Row
                label="Qualidade de imagem"
                control={
                  <Select
                    value={configs.qualidadeImagem}
                    onValueChange={(v: ConfiguracoesSistema['qualidadeImagem']) =>
                      setConfigs((p) => ({ ...p, qualidadeImagem: v }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="original">Original</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <Row
                label="Formato padrão de exportação"
                control={
                  <Select
                    value={configs.formatoPadrao}
                    onValueChange={(v: ConfiguracoesSistema['formatoPadrao']) =>
                      setConfigs((p) => ({ ...p, formatoPadrao: v }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PNG">PNG</SelectItem>
                      <SelectItem value="JPG">JPG</SelectItem>
                      <SelectItem value="SVG">SVG</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </div>
          </section>

          <Separator />

          {/* Privacidade */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Privacidade</h3>
            <div className="space-y-4">
              <Row
                label="Visibilidade do perfil"
                control={
                  <Select
                    value={configs.visibilidadePerfil}
                    onValueChange={(v: ConfiguracoesSistema['visibilidadePerfil']) =>
                      setConfigs((p) => ({ ...p, visibilidadePerfil: v }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publico">Público</SelectItem>
                      <SelectItem value="privado">Privado</SelectItem>
                      <SelectItem value="equipe">Apenas equipe</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <Row
                label="Compartilhamento padrão"
                hint="Define o comportamento ao criar links em link_compartilhado"
                control={
                  <Select
                    value={configs.compartilhamentoPadrao}
                    onValueChange={(v: ConfiguracoesSistema['compartilhamentoPadrao']) =>
                      setConfigs((p) => ({ ...p, compartilhamentoPadrao: v }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="somente_leitura">Somente leitura</SelectItem>
                      <SelectItem value="comentarios">Permitir comentários</SelectItem>
                      <SelectItem value="edicao">Permitir edição</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <ToggleRow
                label="Analytics"
                hint="Permitir coleta anônima para melhoria do produto"
                checked={configs.analyticsEnabled}
                onCheckedChange={(v) => setConfigs((p) => ({ ...p, analyticsEnabled: v }))}
              />
              <Row
                label="Retenção de dados (dias)"
                control={
                  <Input
                    type="number"
                    value={configs.retencaoDados}
                    onChange={(e) =>
                      setConfigs((p) => ({
                        ...p,
                        retencaoDados: Number.isFinite(Number(e.target.value))
                          ? Math.max(1, parseInt(e.target.value, 10))
                          : 365,
                      }))
                    }
                  />
                }
              />
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Zona de Perigo minimalista */}
      <Card className="border-destructive/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-destructive">Zona de perigo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-medium">Resetar configurações</p>
            <p className="text-muted-foreground">Volta tudo para os valores padrão</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} disabled={initializing}>
              <RefreshCw className="h-4 w-4 mr-2" /> Resetar
            </Button>
            <Button variant="destructive" size="sm" disabled>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir dados (em breve)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar configurações</DialogTitle>
            <DialogDescription>Isso irá restaurar os valores padrão. Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancelar</Button>
            <Button onClick={handleReset} disabled={loadingReset || initializing}>
              {loadingReset ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Resetar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar configurações</DialogTitle>
            <DialogDescription>Baixe um JSON com as suas preferências atuais.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancelar</Button>
            <Button onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Exportar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
