'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/callback?next=/dashboard`,
        },
      });

      if (error) {
        setMsg(`Erro ao cadastrar: ${error.message}`);
        return;
      }

      if (data.user && !data.user.confirmed_at) {
        setMsg('Conta criada! Verifique seu e-mail e clique no link de confirmação.');
        return;
      }

      setMsg('Conta criada com sucesso! Redirecionando...');
      router.push('/dashboard');
    } catch (err) {
      console.error('Cadastro - exception:', err);
      const text =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erro inesperado ao cadastrar.';
      setMsg(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>Use e-mail e senha para começar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCadastro} className="space-y-4">
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
                autoComplete="new-password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={sending}
              />
            </div>

            {msg && <p className="text-sm text-center text-destructive">{msg}</p>}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
