'use client'
import { Button } from '@/components/ui/button'
export default function ErroDeConsulta({ mensagem, tentar }: { mensagem: string; tentar: () => void }) {
  return <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
    <p>{mensagem}</p><Button variant="outline" className="mt-3" onClick={tentar}>Tentar novamente</Button>
  </div>
}
