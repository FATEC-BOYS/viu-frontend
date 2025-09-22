// app/reset/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Garante que chegamos aqui com sessão de recovery válida
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?error=recovery_expired');
      }
    })();
  }, [router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (password.length < 6) {
      setMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== password2) {
      setMsg('As senhas não coincidem.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMsg(`Não foi possível redefinir a senha: ${error.message}`);
        return;
      }

      // Por segurança, encerre a sessão de recuperação e peça login novamente
      await supabase.auth.signOut();
      router.replace('/login?msg=senha_atualizada');
    } catch (err) {
      console.error(err);
      setMsg('Erro inesperado ao redefinir sua senha.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Definir nova senha</CardTitle>
          <CardDescription>Crie uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={sending}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Confirmar nova senha</Label>
              <Input
                id="password2"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={sending}
                minLength={6}
                required
              />
            </div>

            {msg && <p className="text-sm text-center text-destructive" aria-live="polite">{msg}</p>}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <Link href="/login" className="text-primary hover:underline">Voltar para o login</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
