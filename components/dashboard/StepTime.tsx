'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepTime() {
  const { user } = useAuth()
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let live = true
    async function check() {
      try {
        // Verifica se há algum projeto (pré-requisito para convidar time)
        // Não há endpoint de participantes no backend — step sempre 'active' se projeto existe
        const res = await api.get<{ pagination: { total: number } }>('/projetos?limit=1')
        if (!live) return
        setState((res.pagination?.total ?? 0) > 0 ? 'active' : 'locked')
      } catch {
        setState('locked')
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
            {isDone ? <CheckCircle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          </div>
          <CardTitle className="text-base font-semibold">Chame o time 🤝</CardTitle>
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
                ? 'Crie um projeto primeiro para poder convidar outras pessoas.'
                : isDone
                ? 'Time reunido! A galera tá pronta 👏'
                : 'Convide quem vai opinar, aprovar ou só espiar. Manda convite com 1 clique.'}
            </CardDescription>
            {!isDone && (
              <Button asChild disabled={isLocked}>
                <Link href="/projetos/participantes">Convidar pessoas</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
