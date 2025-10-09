// components/viewer/approvals/ApprovalBar.tsx
'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, CheckCircle2 } from 'lucide-react';

export default function ApprovalBar({
  activeVersaoId,
  aprovacoesByVersao,
  disabled,
}: {
  activeVersaoId: string | null;
  aprovacoesByVersao: Record<string, any[]>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<'visto' | 'aprovado' | null>(null);

  const aprovadores = useMemo(() => {
    const arr = activeVersaoId ? aprovacoesByVersao[activeVersaoId] ?? [] : [];
    // normaliza
    return arr.map((a: any) => ({
      id: a.id,
      email: a.aprovador_email,
      nome: a.aprovador_nome,
      visto_em: a.visto_em,
      aprovado_em: a.aprovado_em,
    }));
  }, [activeVersaoId, aprovacoesByVersao]);

  const total = aprovadores.length;
  const vistos = aprovadores.filter((a: any) => !!a.visto_em).length;
  const aprovados = aprovadores.filter((a: any) => !!a.aprovado_em).length;

  async function marcarVisto() {
    if (!activeVersaoId) return;
    setBusy('visto');
    try {
      // TODO: chame seu endpoint/RPC para registrar visto (by visitor email)
      // await supabase.rpc('registrar_visto', { versao_id: activeVersaoId, email: visitor.email })
    } finally {
      setBusy(null);
    }
  }

  async function aprovar() {
    if (!activeVersaoId) return;
    setBusy('aprovado');
    try {
      // TODO: chame seu endpoint/RPC para registrar aprovação (by visitor email)
      // await supabase.rpc('registrar_aprovacao', { versao_id: activeVersaoId, email: visitor.email })
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" /> Aprovadores
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{vistos}/{total} viram</Badge>
          <Badge variant="secondary">{aprovados}/{total} aprovaram</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {aprovadores.length > 0 ? (
          aprovadores.map((a: any) => (
            <div key={a.id} className="border rounded-md px-2.5 py-1 text-xs flex items-center gap-2">
              <span className="font-medium">{a.nome || a.email}</span>
              {a.visto_em && <span className="text-muted-foreground">• viu</span>}
              {a.aprovado_em && <span className="text-green-600">• aprovado</span>}
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum aprovador definido para esta versão.</p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={marcarVisto} disabled={!activeVersaoId || disabled || busy === 'visto'}>
          <Eye className="h-4 w-4 mr-1" /> Eu vi
        </Button>
        <Button size="sm" onClick={aprovar} disabled={!activeVersaoId || disabled || busy === 'aprovado'}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
        </Button>
      </div>
    </Card>
  );
}
