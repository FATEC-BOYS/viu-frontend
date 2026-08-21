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
import { ShieldCheck } from 'lucide-react';
import { loginSchema, validarCampos } from '@/lib/schemas';
// TODO: Google OAuth — importar SocialAuthButtons e adicionar botão abaixo do formulário.
// Fluxo esperado: clique → window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`
// O backend redireciona para o Google e retorna em /auth/google/callback com um JWT.
// Ver SocialAuthButtons em components/auth/SocialAuthButtons.tsx.

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
      <div className="flex items-center justify-center min-h-screen bg-background">
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
              ← Voltar
            </Button>
            <div className="opacity-0 pointer-events-none select-none">←</div>
          </div>
          <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
          <CardDescription>Entre para acessar sua conta.</CardDescription>
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
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={sending}
                aria-invalid={erros.senha ? true : undefined}
                aria-describedby={erros.senha ? 'senha-erro' : undefined}
              />
              {erros.senha && (
                <p id="senha-erro" className="text-sm text-destructive">
                  {erros.senha}
                </p>
              )}
            </div>
            {msg && (
              <p className="text-sm text-center text-destructive" aria-live="polite">{msg}</p>
            )}
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between text-sm">
          <Link href="/recuperar" className="text-muted-foreground hover:underline">
            Esqueci minha senha
          </Link>
          <Link href="/cadastro" className="font-semibold text-primary hover:underline">
            Criar conta
          </Link>
        </CardFooter>
      </Card>
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
