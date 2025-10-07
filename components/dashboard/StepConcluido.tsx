'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PartyPopper, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepConcluido() {
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)
  const [latestProjectId, setLatestProjectId] = useState<string | null>(null)

  useEffect(() => {
    let live = true

    async function checkFinalizado() {
      const { data: user } = await supabase.auth.getUser()
      const userId = user?.user?.id
      if (!userId) return

      // Projeto mais recente do designer
      const { data: projetos } = await supabase
        .from('projetos')
        .select('id, status')
        .eq('designer_id', userId)
        .order('criado_em', { ascending: false })
        .limit(1)

      const projeto = projetos?.[0]
      const projetoId = projeto?.id
      setLatestProjectId(projetoId ?? null)

      if (!projetoId) {
        setState('locked')
        setLoading(false)
        return
      }

      // Se o projeto já está concluído, acabou 🎉
      if (projeto.status === 'CONCLUIDO') {
        setState('done')
        setLoading(false)
        return
      }

      // Caso contrário, verificar se alguma arte do projeto está aprovada
      const { data: artesAprovadas, error } = await supabase
        .from('artes')
        .select('id')
        .eq('projeto_id', projetoId)
        .eq('status_atual', 'APROVADO')
        .limit(1)

      if (error) {
        console.error('Erro ao verificar artes aprovadas', error)
        setState('active')
      } else {
        setState((artesAprovadas?.length ?? 0) > 0 ? 'done' : 'active')
      }

      setLoading(false)
    }

    checkFinalizado()
    return () => { live = false }
  }, [])

  const isLocked = state === 'locked'
  const isDone = state === 'done'

  return (
    <Card className={cn('transition-colors', isDone ? 'border-green-400 bg-green-50' : isLocked ? 'opacity-70' : 'border-primary/20 bg-primary/5')}>
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