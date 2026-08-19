'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Barreira de papel para tudo sob /admin.
 *
 * Isto é conveniência de navegação, não segurança: o token vive no
 * localStorage e qualquer pessoa pode editá-lo. Quem protege de verdade é o
 * requireRole('ADMIN') do backend, que continua respondendo 403 mesmo se
 * alguém chegar nestas telas.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user?.tipo !== 'ADMIN') {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="grid place-items-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
          <div className="max-w-sm space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h1 className="font-medium">Área restrita</h1>
              <p className="text-sm text-muted-foreground">
                Esta parte do VIU é só para administradores.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/dashboard">Voltar ao dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
