'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StepCliente() {
  const { user } = useAuth()
  const [state, setState] = useState<'active' | 'done'>('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let live = true
    async function check() {
      try {
        const res = await api.get<{ pagination: { total: number } }>('/usuarios?tipo=CLIENTE&limit=1')
        if (!live) return
        setState((res.pagination?.total ?? 0) > 0 ? 'done' : 'active')
      } catch {
        setState('active')
      } finally {
        if (live) setLoading(false)
      }
    }
    check()
    return () => { live = false }
  }, [user])

  const isDone = state === 'done'

  return (
    <Card className={cn('transition-colors', isDone ? 'border-green-400 bg-green-50' : 'border-primary/20 bg-primary/5')}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-xl p-2', isDone ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary')}>
            {isDone ? <CheckCircle className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <CardTitle className="text-base font-semibold">Quem é seu cliente? 🧑‍🤝‍🧑</CardTitle>
        </div>
        {isDone && <Badge variant="secondary">Feito</Badge>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Verificando...</p>
        ) : (
          <>
            <CardDescription className="text-sm mb-3">
              {isDone
                ? 'Cliente cadastrado! Bora criar um projeto 🎯'
                : 'Projetos precisam de um dono do outro lado. Cadastre um cliente pra chamar de seu 😉'}
            </CardDescription>
            {!isDone && (
              <Button asChild>
                <Link href="/clientes/novo">Cadastrar cliente</Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
