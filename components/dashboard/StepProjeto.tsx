'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FolderPlus, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepProjeto() {
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    async function checkProjetos() {
      const { data: user } = await supabase.auth.getUser()
      const userId = user?.user?.id
      if (!userId) return

      // Verifica se há pelo menos um cliente cadastrado
      const { count: clientesCount } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'CLIENTE')

      if (!clientesCount || clientesCount === 0) {
        setState('locked')
        setLoading(false)
        return
      }

      // Verifica se já existem projetos do designer atual
      const { count, error } = await supabase
        .from('projetos')
        .select('*', { count: 'exact', head: true })
        .eq('designer_id', userId)

      if (!live) return
      if (error) {
        console.error('Erro ao verificar projetos', error)
        setState('active')
      } else {
        setState(count && count > 0 ? 'done' : 'active')
      }
      setLoading(false)
    }
    checkProjetos()
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
            {isDone ? <CheckCircle className="h-5 w-5" /> : <FolderPlus className="h-5 w-5" />}
          </div>
          <CardTitle className="text-base font-semibold">Bora criar seu primeiro projeto? 📁</CardTitle>
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
                ? 'Você precisa ter pelo menos um cliente cadastrado pra criar um projeto.'
                : isDone
                ? 'Projeto criado! Já pode subir sua primeira arte 🎨'
                : 'Nome, cliente e um prazo. Simples assim. Depois a gente enfeita.'}
            </CardDescription>
            {!isDone && (
              <Button asChild disabled={isLocked}>
                <Link href="/projetos/novo">Criar projeto</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}