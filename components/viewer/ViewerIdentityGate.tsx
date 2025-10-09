// components/viewer/ViewerIdentityGate.tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

export default function ViewerIdentityGate({
  onConfirm,
}: {
  onConfirm: (v: { email: string; nome?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('viu.viewer.identity');
      if (!raw) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function handleConfirm() {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    const payload = { email, nome: nome || undefined };
    try {
      localStorage.setItem('viu.viewer.identity', JSON.stringify(payload));
    } catch {}
    onConfirm(payload);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => v && setOpen(true)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Identifique-se
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Para comentar e receber retorno sobre esta arte, informe seu e-mail. Usaremos apenas para identificar seus feedbacks.
        </p>

        <div className="grid gap-3 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nome">Seu nome (opcional)</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Silva" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Seu e-mail</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              type="email"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Depois
          </Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Dica: salvamos esses dados no seu navegador. Você pode alterar a qualquer momento limpando os dados do site.
        </p>
      </DialogContent>
    </Dialog>
  );
}
