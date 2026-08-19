'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PartyPopper, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepConcluido() {
  const { user } = useAuth()
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)
  const [latestProjectId, setLatestProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let live = true
    async function check() {
      try {
        const projetosRes = await api.get<{ data: { id: string; status: string }[]; pagination: { total: number } }>('/projetos?limit=1')
        if (!live) return
        const projeto = projetosRes.data?.[0]
        setLatestProjectId(projeto?.id ?? null)
        if (!projeto) { setState('locked'); setLoading(false); return }

        if (projeto.status === 'CONCLUIDO') { setState('done'); setLoading(false); return }

        const artesRes = await api.get<{ pagination: { total: number } }>(`/artes?projetoId=${projeto.id}&status=APROVADO&limit=1`)
        if (!live) return
        setState((artesRes.pagination?.total ?? 0) > 0 ? 'done' : 'active')
      } catch {
        setState('active')
      } finally {
        if (live) setLoading(false)
      }
    }
    check()
    return () => { live = false }
  }, [user])

  const isLocked = state === 'locked'
  const isDone = state === 'done'

  return (
    <Card className={cn('transition-colors', isDone ? 'border-green-400 bg-green-50 dark:bg-green-950/40' : isLocked ? 'opacity-70' : 'border-primary/20 bg-primary/5')}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-xl p-2', isDone ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary')}>
            {isDone ? <CheckCircle className="h-5 w-5" /> : <PartyPopper className="h-5 w-5" />}
          </div>
          <CardTitle className="text-base font-semibold">Pronto! Próximo nível 🚀</CardTitle>
        </div>
        {isDone && <Badge variant="secondary">Feito</Badge>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Verificando...</p>
        ) : (
          <>
            <CardDescription className="text-sm mb-3">
              {isLocked
                ? 'Crie um projeto e avance nos passos para celebrar a entrega.'
                : isDone
                ? 'Tudo aprovado e/ou projeto concluído! Você mandou bem 🥳'
                : 'Finalize com aprovação para desbloquear sua conquista.'}
            </CardDescription>
            {isDone ? (
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/projetos/novo">Novo projeto</Link>
                </Button>
                {latestProjectId && (
                  <Button asChild variant="outline">
                    <Link href={`/projetos/${latestProjectId}`}>Ver entrega</Link>
                  </Button>
                )}
              </div>
            ) : (
              !isLocked && (
                <Button asChild>
                  <Link href="/aprovacoes">Solicitar aprovação</Link>
                </Button>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
