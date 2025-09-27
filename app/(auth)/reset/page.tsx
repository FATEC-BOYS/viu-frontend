// app/reset/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (password.length < 8) {
      setMsg('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setMsg('As senhas não conferem.');
      return;
    }

    try {
      setSending(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error(error);
        setMsg('Não foi possível atualizar a senha.');
        return;
      }
      setMsg('Senha atualizada com sucesso. Redirecionando…');
      setTimeout(() => router.replace('/login?reset=ok'), 900);
    } catch (err) {
      console.error(err);
      setMsg('Erro inesperado ao atualizar a senha.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Definir nova senha</CardTitle>
          <CardDescription>Crie uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={sending}
              />
            </div>

            {msg && <p className="text-sm text-center text-muted-foreground">{msg}</p>}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <button
            className="text-muted-foreground hover:underline"
            onClick={() => history.back()}
          >
            Voltar
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
