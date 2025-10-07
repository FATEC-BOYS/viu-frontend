'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquareText, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepFeedback() {
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true

    async function checkFeedback() {
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

      // Artes do projeto
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

      // Há feedbacks nessas artes?
      const { count: fbCount } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .in('arte_id', arteIds)

      // Ou já existe link compartilhado com permissão para comentar?
      const { count: linkCount } = await supabase
        .from('link_compartilhado')
        .select('*', { count: 'exact', head: true })
        .eq('projeto_id', projetoId)
        .eq('can_comment', true)

      const hasFeedbackOrLink = (fbCount ?? 0) > 0 || (linkCount ?? 0) > 0

      if (!live) return
      setState(hasFeedbackOrLink ? 'done' : 'active')
      setLoading(false)
    }

    checkFeedback()
    return () => { live = false }
  }, [])

  const isLocked = state === 'locked'
  const isDone = state === 'done'

  return (
    <Card className={cn('transition-colors', isDone ? 'border-green-400 bg-green-50' : isLocked ? 'opacity-70' : 'border-primary/20 bg-primary/5')}>
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
                ? 'Feedback recebido (ou link já gerado)! Próxima parada: aprovação ✅'
                : 'Compartilhe um link de review e receba comentários direto na peça.'}
            </CardDescription>
            {!isDone && (
              <Button asChild disabled={isLocked}>
                <Link href="/links">Gerar link de review</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}