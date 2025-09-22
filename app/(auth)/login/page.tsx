'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.9 0-12.5-5.6-12.5-12.5S17.1 11 24 11c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 5.4 29.6 3.3 24 3.3 12.4 3.3 3 12.7 3 24.3S12.4 45.3 24 45.3c11.3 0 21-8.2 21-21 0-1.6-.2-3.1-.4-4.8z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.9C14.8 16.5 19 14 24 14c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 7.4 29.6 5.3 24 5.3c-7.1 0-13.3 3.6-17 9.4z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.3c5.2 0 9.6-1.7 12.8-4.7l-6-4.9C29.1 35.3 26.7 36 24 36c-5.3 0-9.7-3.4-11.4-8.1l-6.6 5C9.8 39.5 16.4 43.3 24 43.3z"
      />
      <path
        fill="#1976D2"
        d="M45 24.3c0-1.3-.1-2.6-.4-3.8H24v8h11.3c-.7 3.4-2.8 6.2-5.8 8.1l6 4.9C39.9 38.9 45 32.4 45 24.3z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg('E-mail ou senha inválidos.');
        return;
      }

      if (data.session) {
        router.push('/dashboard');
      } else {
        setMsg('Não foi possível iniciar sessão. Tente novamente.');
      }
    } catch (err) {
      console.error('Login - exception:', err);
      setMsg('Erro inesperado ao fazer login.');
    } finally {
      setSending(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setSending(true);
      setMsg(null);
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) setMsg(`Erro ao redirecionar: ${error.message}`);
    } catch (err) {
      console.error(err);
      setMsg('Não foi possível iniciar o login com Google.');
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
              />
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
              />
            </div>

            {msg && (
              <p className="text-sm text-center text-destructive" aria-live="polite">
                {msg}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="relative my-3 flex items-center">
              <div className="h-px flex-1 bg-border" />
              <span className="px-3 text-xs text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogle}
              disabled={sending}
            >
              <GoogleIcon />
              {sending ? 'Conectando...' : 'Entrar com Google'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between text-sm">
          <Link
            href="/recuperar"
            className="text-muted-foreground hover:underline"
          >
            Esqueci minha senha
          </Link>
          <Link
            href="/cadastro"
            className="font-semibold text-primary hover:underline"
          >
            Criar conta
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
