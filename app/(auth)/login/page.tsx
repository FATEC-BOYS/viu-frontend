'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const nextParam = search.get('next');
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);

    try {
      await signIn(email, password);
      router.push(nextParam || '/dashboard');
    } catch (err: any) {
      setMsg(err?.message ?? 'E-mail ou senha inválidos.');
    } finally {
      setSending(false);
    }
  };

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
