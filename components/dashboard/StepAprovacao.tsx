'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BadgeCheck, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepAprovacao() {
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true

    async function checkAprovacoes() {
      const { data: user } = await supabase.auth.getUser()
      const userId = user?.user?.id
      if (!userId) return

      // Projeto mais recente do designer
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

      // Verifica se há ao menos 1 arte no projeto (pré-requisito)
      const { data: artes } = await supabase
        .from('artes')
        .select('id')
        .eq('projeto_id', projetoId)

      const arteIds = (artes ?? []).map(a => a.id)
      if (arteIds.length === 0) {
        setState('locked')
        setLoading(false)
        return
      }

      // Existe alguma aprovação vinculada a essas artes?
      const { count: aprovCount } = await supabase
        .from('aprovacoes')
        .select('*', { count: 'exact', head: true })
        .in('arte_id', arteIds)

      if (!live) return
      setState((aprovCount ?? 0) > 0 ? 'done' : 'active')
      setLoading(false)
    }

    checkAprovacoes()
    return () => { live = false }
  }, [])

  const isLocked = state === 'locked'
  const isDone = state === 'done'

  return (
    <Card className={cn('transition-colors', isDone ? 'border-green-400 bg-green-50' : isLocked ? 'opacity-70' : 'border-primary/20 bg-primary/5')}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-xl p-2', isDone ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary')}>
            {isDone ? <CheckCircle className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
          </div>
          <CardTitle className="text-base font-semibold">Hora do carimbo ✅</CardTitle>
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
                ? 'Envie uma arte primeiro para solicitar aprovação.'
                : isDone
                ? 'Aprovação criada ou concluída! Reta final 👏'
                : 'Escolha quem aprova e fique em paz. A gente lembra se atrasar 😉'}
            </CardDescription>
            {!isDone && (
              <Button asChild disabled={isLocked}>
                <Link href="/aprovacoes">Solicitar aprovação</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}