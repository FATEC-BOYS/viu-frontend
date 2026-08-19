'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FolderPlus, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepProjeto() {
  const { user } = useAuth()
  const [state, setState] = useState<'locked' | 'active' | 'done'>('locked')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let live = true
    async function check() {
      try {
        const [clientesRes, projetosRes] = await Promise.all([
          api.get<{ pagination: { total: number } }>('/usuarios?tipo=CLIENTE&limit=1'),
          api.get<{ pagination: { total: number } }>('/projetos?limit=1'),
        ])
        if (!live) return
        const hasClientes = (clientesRes.pagination?.total ?? 0) > 0
        const hasProjetos = (projetosRes.pagination?.total ?? 0) > 0
        setState(!hasClientes ? 'locked' : hasProjetos ? 'done' : 'active')
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
