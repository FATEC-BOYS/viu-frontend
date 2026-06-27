'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImagePlus, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepArte() {
  const { user } = useAuth()
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let live = true
    async function check() {
      try {
        const projetosRes = await api.get<{ data: { id: string }[]; pagination: { total: number } }>('/projetos?limit=1')
        if (!live) return
        const projetoId = projetosRes.data?.[0]?.id
        if (!projetoId) { setState('locked'); setLoading(false); return }

        const artesRes = await api.get<{ pagination: { total: number } }>(`/artes?projetoId=${projetoId}&limit=1`)
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
    <Card className={cn('transition-colors', isDone ? 'border-green-400 bg-green-50' : isLocked ? 'opacity-70' : 'border-primary/20 bg-primary/5')}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-xl p-2', isDone ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary')}>
            {isDone ? <CheckCircle className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
          </div>
          <CardTitle className="text-base font-semibold">Suba sua primeira arte 🎨</CardTitle>
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
                ? 'Crie um projeto primeiro para poder enviar artes.'
                : isDone
                ? 'Arte enviada! Agora compartilhe para receber feedback 💬'
                : 'Arraste o arquivo e veja a mágica acontecer ✨'}
            </CardDescription>
            {!isDone && (
              <Button asChild disabled={isLocked}>
                <Link href="/artes/nova">Enviar arquivo</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
