'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
import { Badge } from '@/components/ui/badge';
import { Save, Download, RefreshCw, Trash2, Loader2, ShieldCheck, ShieldOff, KeyRound, Copy, Check } from 'lucide-react';

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
  retencaoDados: number;
  compartilhamentoPadrao: 'somente_leitura' | 'comentarios' | 'edicao';
  visibilidadePerfil: 'publico' | 'privado' | 'equipe';
  analyticsEnabled: boolean;
}

const PREFS_KEY = (uid: string) => `viu_prefs_${uid}`;

const DEFAULT_CONFIGS: ConfiguracoesSistema = {
  tema: 'claro', idioma: 'pt-BR', timezone: 'America/Sao_Paulo',
  notificacoesPush: true, notificacoesEmail: true, notificacoesSms: false,
  emailDigest: 'diario', autoSave: true, qualidadeImagem: 'alta',
  formatoPadrao: 'PNG', backupAutomatico: true, retencaoDados: 365,
  compartilhamentoPadrao: 'somente_leitura', visibilidadePerfil: 'publico',
  analyticsEnabled: true,
};

/** ---------- Helpers de layout ---------- */
function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 items-center">
      <div>
        <Label className="font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="md:col-span-2">{control}</div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onCheckedChange, disabled }: {
  label: string; hint?: string; checked: boolean;
  onCheckedChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/** ---------- Seção 2FA ---------- */
type TwoFAStep = 'idle' | 'setup' | 'verify' | 'disable' | 'regenerate' | 'show-backup';

function TwoFactorSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<TwoFAStep>('idle');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const [setupData, setSetupData] = useState<{ qrCode: string; manualEntryKey: string; backupCodes: string[] } | null>(null);
  const [shownCodes, setShownCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<{ data: { enabled: boolean }; success: boolean }>('/2fa/status');
      setEnabled(res.data.enabled);
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSetup = async () => {
    setWorking(true);
    setError('');
    try {
      const res = await api.post<{ data: { qrCode: string; manualEntryKey: string; backupCodes: string[] }; success: boolean }>('/2fa/setup', {});
      setSetupData(res.data);
      setStep('setup');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao iniciar configuração');
    } finally {
      setWorking(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    setError('');
    try {
      await api.post('/2fa/enable', { code });
      setEnabled(true);
      setSetupData(null);
      setCode('');
      setStep('idle');
    } catch (e: any) {
      setError(e.message ?? 'Código inválido');
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    setError('');
    try {
      await api.post('/2fa/disable', { password });
      setEnabled(false);
      setPassword('');
      setStep('idle');
    } catch (e: any) {
      setError(e.message ?? 'Senha incorreta');
    } finally {
      setWorking(false);
    }
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorking(true);
    setError('');
    try {
      const res = await api.post<{ data: { backupCodes: string[] }; success: boolean }>('/2fa/regenerate-backup-codes', { password });
      setShownCodes(res.data.backupCodes);
      setPassword('');
      setStep('show-backup');
    } catch (e: any) {
      setError(e.message ?? 'Senha incorreta');
    } finally {
      setWorking(false);
    }
  };

  const copyBackupCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const reset = () => { setStep('idle'); setCode(''); setPassword(''); setError(''); setSetupData(null); setShownCodes([]); };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Autenticação de dois fatores (2FA)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Proteja sua conta exigindo um código adicional no login.
          </p>
        </div>
        <Badge variant={enabled ? 'default' : 'secondary'}>
          {enabled ? 'Ativado' : 'Desativado'}
        </Badge>
      </div>

      {/* idle — botões de ação */}
      {step === 'idle' && (
        <div className="flex gap-2 flex-wrap">
          {!enabled ? (
            <Button size="sm" onClick={handleSetup} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Configurar 2FA
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setStep('regenerate')}>
                <KeyRound className="h-4 w-4 mr-2" /> Regenerar códigos de backup
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setStep('disable')}>
                <ShieldOff className="h-4 w-4 mr-2" /> Desativar 2FA
              </Button>
            </>
          )}
        </div>
      )}

      {/* setup — QR Code */}
      {step === 'setup' && setupData && (
        <div className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">1. Escaneie o QR code com seu app autenticador</p>
          <div className="flex justify-center">
            <img src={setupData.qrCode} alt="QR Code 2FA" className="h-48 w-48 rounded border" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Ou insira manualmente: <code className="font-mono bg-muted px-1 rounded text-xs">{setupData.manualEntryKey}</code>
          </p>

          <p className="text-sm font-medium">2. Salve seus códigos de backup</p>
          <div className="grid grid-cols-2 gap-1">
            {setupData.backupCodes.map((c) => (
              <code key={c} className="text-xs font-mono bg-muted rounded px-2 py-1">{c}</code>
            ))}
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => copyBackupCodes(setupData.backupCodes)}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copiado!' : 'Copiar códigos'}
          </Button>

          <p className="text-sm font-medium">3. Confirme com o código gerado</p>
          <form onSubmit={handleEnable} className="space-y-3">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={working}
              className="text-center tracking-widest"
            />
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={reset} disabled={working}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={working || code.length < 6}>
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ativar 2FA'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* disable */}
      {step === 'disable' && (
        <form onSubmit={handleDisable} className="space-y-3 rounded-lg border border-destructive/30 p-4">
          <p className="text-sm text-destructive font-medium">Confirme sua senha para desativar o 2FA</p>
          <Input type="password" placeholder="Sua senha atual" value={password} onChange={(e) => setPassword(e.target.value)} disabled={working} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={reset} disabled={working}>Cancelar</Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={working || !password}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desativar'}
            </Button>
          </div>
        </form>
      )}

      {/* regenerate */}
      {step === 'regenerate' && (
        <form onSubmit={handleRegenerate} className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Confirme sua senha para gerar novos códigos</p>
          <p className="text-xs text-muted-foreground">Os códigos atuais serão invalidados.</p>
          <Input type="password" placeholder="Sua senha atual" value={password} onChange={(e) => setPassword(e.target.value)} disabled={working} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={reset} disabled={working}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={working || !password}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar novos códigos'}
            </Button>
          </div>
        </form>
      )}

      {/* show-backup */}
      {step === 'show-backup' && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Novos códigos de backup — salve agora</p>
          <div className="grid grid-cols-2 gap-1">
            {shownCodes.map((c) => (
              <code key={c} className="text-xs font-mono bg-muted rounded px-2 py-1">{c}</code>
            ))}
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => copyBackupCodes(shownCodes)}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copiado!' : 'Copiar códigos'}
          </Button>
          <Button size="sm" className="w-full" onClick={reset}>Concluir</Button>
        </div>
      )}
    </section>
  );
}

/** ---------- Página principal ---------- */
export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ConfiguracoesSistema>(DEFAULT_CONFIGS);
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    if (!user?.id) { setInitializing(false); return; }
    try {
      const raw = localStorage.getItem(PREFS_KEY(user.id));
      if (raw) setConfigs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {
      // usa defaults
    } finally {
      setInitializing(false);
    }
  }, [user?.id]);

  const handleSave = () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      localStorage.setItem(PREFS_KEY(user.id), JSON.stringify(configs));
    } finally {
      setTimeout(() => setSaving(false), 300);
    }
  };

  const handleReset = () => {
    setLoadingReset(true);
    try {
      setConfigs(DEFAULT_CONFIGS);
      if (user?.id) localStorage.setItem(PREFS_KEY(user.id), JSON.stringify(DEFAULT_CONFIGS));
      setShowResetDialog(false);
    } finally {
      setLoadingReset(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ configuracoes: configs, dataExport: new Date().toISOString(), versao: '1.0.0' }, null, 2)], { type: 'application/json' });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Ajuste preferências da sua conta e do app</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || initializing || !user?.id}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preferências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Aparência</h3>
            <div className="space-y-4">
              <Row label="Tema" control={
                <Select value={configs.tema} onValueChange={(v: ConfiguracoesSistema['tema']) => setConfigs((p) => ({ ...p, tema: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claro">Claro</SelectItem>
                    <SelectItem value="escuro">Escuro</SelectItem>
                    <SelectItem value="automatico">Automático</SelectItem>
                  </SelectContent>
                </Select>
              } />
              <Row label="Idioma" control={
                <Select value={configs.idioma} onValueChange={(v: ConfiguracoesSistema['idioma']) => setConfigs((p) => ({ ...p, idioma: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              } />
              <Row label="Fuso horário" control={
                <Select value={configs.timezone} onValueChange={(v: ConfiguracoesSistema['timezone']) => setConfigs((p) => ({ ...p, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                    <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              } />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Notificações</h3>
            <div className="space-y-3">
              <ToggleRow label="Notificações push" hint="Receba alertas no navegador" checked={configs.notificacoesPush} onCheckedChange={(v) => setConfigs((p) => ({ ...p, notificacoesPush: v }))} />
              <ToggleRow label="Notificações por e-mail" checked={configs.notificacoesEmail} onCheckedChange={(v) => setConfigs((p) => ({ ...p, notificacoesEmail: v }))} />
              <ToggleRow label="Notificações por SMS" checked={configs.notificacoesSms} onCheckedChange={(v) => setConfigs((p) => ({ ...p, notificacoesSms: v }))} />
              <Row label="Resumo por e-mail" control={
                <Select value={configs.emailDigest} onValueChange={(v: ConfiguracoesSistema['emailDigest']) => setConfigs((p) => ({ ...p, emailDigest: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nunca">Nunca</SelectItem>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              } />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Sistema</h3>
            <div className="space-y-3">
              <ToggleRow label="Salvamento automático" checked={configs.autoSave} onCheckedChange={(v) => setConfigs((p) => ({ ...p, autoSave: v }))} />
              <ToggleRow label="Backup automático" checked={configs.backupAutomatico} onCheckedChange={(v) => setConfigs((p) => ({ ...p, backupAutomatico: v }))} />
            </div>
            <div className="space-y-4">
              <Row label="Qualidade de imagem" control={
                <Select value={configs.qualidadeImagem} onValueChange={(v: ConfiguracoesSistema['qualidadeImagem']) => setConfigs((p) => ({ ...p, qualidadeImagem: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="original">Original</SelectItem>
                  </SelectContent>
                </Select>
              } />
              <Row label="Formato padrão de exportação" control={
                <Select value={configs.formatoPadrao} onValueChange={(v: ConfiguracoesSistema['formatoPadrao']) => setConfigs((p) => ({ ...p, formatoPadrao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PNG">PNG</SelectItem>
                    <SelectItem value="JPG">JPG</SelectItem>
                    <SelectItem value="SVG">SVG</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                  </SelectContent>
                </Select>
              } />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Privacidade</h3>
            <div className="space-y-4">
              <Row label="Visibilidade do perfil" control={
                <Select value={configs.visibilidadePerfil} onValueChange={(v: ConfiguracoesSistema['visibilidadePerfil']) => setConfigs((p) => ({ ...p, visibilidadePerfil: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">Público</SelectItem>
                    <SelectItem value="privado">Privado</SelectItem>
                    <SelectItem value="equipe">Apenas equipe</SelectItem>
                  </SelectContent>
                </Select>
              } />
              <Row label="Compartilhamento padrão" hint="Define o comportamento ao criar links compartilhados" control={
                <Select value={configs.compartilhamentoPadrao} onValueChange={(v: ConfiguracoesSistema['compartilhamentoPadrao']) => setConfigs((p) => ({ ...p, compartilhamentoPadrao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="somente_leitura">Somente leitura</SelectItem>
                    <SelectItem value="comentarios">Permitir comentários</SelectItem>
                    <SelectItem value="edicao">Permitir edição</SelectItem>
                  </SelectContent>
                </Select>
              } />
              <ToggleRow label="Analytics" hint="Permitir coleta anônima para melhoria do produto" checked={configs.analyticsEnabled} onCheckedChange={(v) => setConfigs((p) => ({ ...p, analyticsEnabled: v }))} />
              <Row label="Retenção de dados (dias)" control={
                <Input type="number" value={configs.retencaoDados} onChange={(e) =>
                  setConfigs((p) => ({ ...p, retencaoDados: Math.max(1, parseInt(e.target.value, 10) || 365) }))
                } />
              } />
            </div>
          </section>

          <Separator />

          <TwoFactorSection />
        </CardContent>
      </Card>

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
            <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Resetar
            </Button>
            <Button variant="destructive" size="sm" disabled>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir dados (em breve)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar configurações</DialogTitle>
            <DialogDescription>Isso irá restaurar os valores padrão. Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancelar</Button>
            <Button onClick={handleReset} disabled={loadingReset}>
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
