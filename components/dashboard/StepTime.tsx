'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepTime() {
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true

    async function checkParticipantes() {
      const { data: user } = await supabase.auth.getUser()
      const userId = user?.user?.id
      if (!userId) return

      // Busca o projeto mais recente do designer
      const { data: projetos } = await supabase
        .from('projetos')
        .select('id')
        .eq('designer_id', userId)
        .order('criado_em', { ascending: false })
        .limit(1)

      const projetoId = projetos?.[0]?.id
      if (!projetoId) {
        setState('locked')
        setLoading(false)
        return
      }

      // Verifica se há participantes (além do próprio designer)
      const { count, error } = await supabase
        .from('projeto_participantes')
        .select('*', { count: 'exact', head: true })
        .eq('projeto_id', projetoId)
        .neq('usuario_id', userId)

      if (!live) return
      if (error) {
        console.error('Erro ao verificar participantes', error)
        setState('active')
      } else {
        setState(count && count > 0 ? 'done' : 'active')
      }
      setLoading(false)
    }

    checkParticipantes()
    return () => {
      live = false
    }
  }, [])

  const isLocked = state === 'locked'
  const isDone = state === 'done'

  return (
    <Card className={cn('transition-colors', isDone ? 'border-green-400 bg-green-50' : isLocked ? 'opacity-70' : 'border-primary/20 bg-primary/5')}>
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