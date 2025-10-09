// components/viewer/versions/VersionTimeline.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function VersionTimeline({
  versoes,
  activeVersao,
  onChange,
  countsByVersao,
}: {
  versoes: { id: string | null; numero: number; criado_em: string; status: string | null }[];
  activeVersao: string | 'all';
  onChange: (v: string | 'all') => void;
  countsByVersao: Record<string, number>;
}) {
  const last = versoes.at(-1);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Versões</h3>
        <button
          className={`text-xs underline ${activeVersao === 'all' ? 'text-foreground' : 'text-muted-foreground'}`}
          onClick={() => onChange('all')}
        >
          Ver todas
        </button>
      </div>

      <div className="space-y-2">
        {versoes.map((v) => {
          const key = v.id ?? 'unknown';
          const isActive = activeVersao === key;
          const isLatest = last && last.numero === v.numero;

          return (
            <button
              key={`${key}-${v.numero}`}
              onClick={() => onChange(key)}
              className={`w-full text-left border rounded-md px-3 py-2 hover:bg-muted/60 transition ${
                isActive ? 'bg-muted/60 border-foreground/20' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">v{v.numero}</span>
                <div className="flex items-center gap-1">
                  {isLatest && <Badge variant="secondary">Atual</Badge>}
                  {v.status && <Badge variant="outline">{v.status}</Badge>}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{new Date(v.criado_em).toLocaleString('pt-BR')}</span>
                <span>{countsByVersao[v.id ?? 'unknown'] ?? 0} msgs</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
