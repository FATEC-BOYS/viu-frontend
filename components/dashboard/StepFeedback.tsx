'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquareText, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepFeedback() {
  const { user } = useAuth()
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let live = true
    async function check() {
      try {
        // Pré-requisito: ter um projeto com pelo menos uma arte
        const projetosRes = await api.get<{ data: { id: string }[]; pagination: { total: number } }>('/projetos?limit=1')
        if (!live) return
        const projetoId = projetosRes.data?.[0]?.id
        if (!projetoId) { setState('locked'); setLoading(false); return }

        const artesRes = await api.get<{ pagination: { total: number } }>(`/artes?projetoId=${projetoId}&limit=1`)
        if (!live) return
        if ((artesRes.pagination?.total ?? 0) === 0) { setState('locked'); setLoading(false); return }

        // Há feedbacks?
        const fbRes = await api.get<{ pagination: { total: number } }>('/feedbacks?limit=1')
        if (!live) return
        setState((fbRes.pagination?.total ?? 0) > 0 ? 'done' : 'active')
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
            {isDone ? <CheckCircle className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
          </div>
          <CardTitle className="text-base font-semibold">Peça feedback 💬</CardTitle>
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
                ? 'Envie uma arte primeiro para compartilhar e receber comentários.'
                : isDone
                ? 'Feedback recebido! Próxima parada: aprovação ✅'
                : 'Compartilhe um link de review e receba comentários direto na peça.'}
            </CardDescription>
            {!isDone && (
              <Button asChild disabled={isLocked}>
                {/* O link é gerado no envio da arte, não na listagem. */}
                <Link href="/artes">Gerar link de review</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
