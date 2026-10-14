'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ArrowRight, Check, Eye, EyeOff, FolderKanban, LockKeyhole, Palette, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { loginSchema, validarCampos } from '@/lib/schemas';

function LoginContent() {
  const router = useRouter();
  const search = useSearchParams();
  const nextParam = search.get('next');
  const { signIn, completeTwoFactorLogin } = useAuth();

  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [pendingUserId, setPendingUserId] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // Formato de e-mail e senha vazia são erros que dá para apontar no campo,
    // sem gastar uma ida ao servidor para voltar com "credenciais inválidas".
    const validacao = validarCampos(loginSchema, { email, senha: password });
    if (!validacao.ok) {
      setErros(validacao.erros);
      return;
    }
    setErros({});

    setSending(true);
    try {
      await signIn(email, password);
      router.push(nextParam || '/dashboard');
    } catch (err: any) {
      if (err.message === '2FA_REQUIRED') {
        setPendingUserId(err.userId);
        setStep('2fa');
        return;
      }
      setMsg(err?.message ?? 'E-mail ou senha inválidos.');
    } finally {
      setSending(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    try {
      await completeTwoFactorLogin(pendingUserId, code);
      router.push(nextParam || '/dashboard');
    } catch (err: any) {
      setMsg(err?.message ?? 'Código inválido. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (step === '2fa') {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verificação em dois fatores</CardTitle>
            <CardDescription>
              Digite o código de 6 dígitos do seu aplicativo autenticador (ou um código de backup).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handle2FA} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={10}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                  disabled={sending}
                  className="text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>
              {msg && (
                <p className="text-sm text-center text-destructive" aria-live="polite">{msg}</p>
              )}
              <Button type="submit" className="w-full" disabled={sending || code.length < 6}>
                {sending ? 'Verificando...' : 'Verificar'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:underline"
              onClick={() => { setStep('login'); setCode(''); setMsg(null); }}
            >
              Voltar para o login
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
      <section className="relative hidden min-h-[470px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/35 p-9 shadow-2xl shadow-primary/10 backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -right-20 -top-20 size-64 rounded-full bg-pastel-lavanda/60 blur-2xl" />
        <div aria-hidden className="absolute -bottom-24 -left-16 size-72 rounded-full bg-pastel-pessego/70 blur-2xl" />
        <div className="relative">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
              <Sparkles data-icon="inline-start" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">Seu estúdio, mais leve.</span>
          </div>
          <p className="max-w-md text-sm font-semibold uppercase tracking-[0.18em] text-primary">Bem-vindo ao VIU</p>
          <h2 className="mt-4 max-w-lg font-display text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-foreground">
            Ideias bonitas também merecem organização.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            Centralize projetos, clientes e entregas em um espaço feito para o seu ritmo criativo.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {[
            { icon: FolderKanban, value: 'Projetos', label: 'em um só lugar' },
            { icon: UsersRound, value: 'Clientes', label: 'mais próximos' },
            { icon: Palette, value: 'Criação', label: 'sem ruído' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={value} className="rounded-2xl border border-white/80 bg-white/55 p-4 shadow-sm backdrop-blur-xl">
              <Icon className="mb-7 text-primary" aria-hidden />
              <p className="text-sm font-semibold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="w-full max-w-md lg:justify-self-end">
      <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex size-9 items-center justify-center rounded-xl bg-pastel-pessego text-primary">
          <Sparkles data-icon="inline-start" />
        </div>
        <div>
          <p className="font-medium text-foreground">Seu espaço criativo</p>
          <p>Projetos, clientes e ideias em um só lugar.</p>
        </div>
      </div>
      <Card className="w-full max-w-md overflow-hidden border-white/75 bg-white/70 shadow-2xl shadow-primary/10 backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/70 bg-white/45 px-6 py-3 backdrop-blur-xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Acesso seguro</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
            VIU protegido
          </span>
        </div>
        {/*
          Aqui havia um "← Voltar" com `router.back()`, e um `<div>` invisível
          ao lado só para equilibrar o flex.

          Numa aba nova — link de e-mail, favorito, endereço digitado — não há
          histórico para voltar: o botão levava a `about:blank`. Uma tela em
          branco como saída de emergência é pior que saída nenhuma, porque
          parece que funciona.

          O caminho de volta agora é a marca no topo, no layout: existe sempre,
          não depende de histórico, e diz de que site é esta página.
        */}
        <CardHeader className="space-y-2">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole data-icon="inline-start" />
          </div>
          <CardTitle className="font-display text-3xl tracking-tight">Bem-vindo de volta</CardTitle>
          <CardDescription className="text-[15px]">Entre para continuar de onde parou.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
                aria-invalid={erros.email ? true : undefined}
                aria-describedby={erros.email ? 'email-erro' : undefined}
              />
              {erros.email && (
                <p id="email-erro" className="text-sm text-destructive">
                  {erros.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={sending}
                aria-invalid={erros.senha ? true : undefined}
                aria-describedby={erros.senha ? 'senha-erro' : undefined}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="relative -mt-10 mb-3 ml-auto mr-3 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
              </button>
              {erros.senha && (
                <p id="senha-erro" className="text-sm text-destructive">
                  {erros.senha}
                </p>
              )}
            </div>
            {msg && (
              <p className="text-sm text-center text-destructive" aria-live="polite">{msg}</p>
            )}
            <Button type="submit" className="group w-full" disabled={sending}>
              {sending ? 'Entrando...' : <>Entrar <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-0.5" /></>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href="/recuperar" className="text-muted-foreground hover:underline">
            Esqueci minha senha
          </Link>
          {/* O `next` atravessa: quem caiu aqui vindo de uma arte e descobre
              que não tem conta não pode perder a volta ao trocar de tela. */}
          <Link
            href={nextParam ? `/cadastro?next=${encodeURIComponent(nextParam)}` : "/cadastro"}
            className="font-semibold text-primary hover:underline"
          >
            Criar conta
          </Link>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
