'use client'

import PageHeader from "@/components/layout/PageHeader";
import { FadeIn } from "@/components/layout/Motion";
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Monitor, Loader2, ShieldAlert, LogOut } from 'lucide-react'

interface Sessao {
  id: string
  ativo: boolean
  expiresAt: string
  criadoEm: string
  isCurrent: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isExpired(iso: string) {
  return new Date(iso) < new Date()
}

export default function SessoesPage() {
  const { signOut } = useAuth()
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)

  const fetchSessoes = useCallback(async () => {
    try {
      const res = await api.get<{ data: Sessao[]; success: boolean }>('/sessoes')
      setSessoes(res.data)
    } catch {
      setSessoes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessoes() }, [fetchSessoes])

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      await api.delete(`/sessoes/${id}`)
      setSessoes((prev) => prev.map((s) => s.id === id ? { ...s, ativo: false } : s))
    } catch {
      // ignore — UI stays consistent
    } finally {
      setRevoking(null)
    }
  }

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    setConfirmRevokeAll(false)
    try {
      await api.post('/sessoes/revoke-others', {})
      setSessoes((prev) => prev.map((s) => s.isCurrent ? s : { ...s, ativo: false }))
    } catch {
      // ignore
    } finally {
      setRevokingAll(false)
    }
  }

  const ativas = sessoes.filter((s) => s.ativo && !isExpired(s.expiresAt))
  const inativas = sessoes.filter((s) => !s.ativo || isExpired(s.expiresAt))
  const outrasAtivas = ativas.filter((s) => !s.isCurrent)

  return (
    <FadeIn className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <PageHeader
        title="Sessões ativas"
        description="Gerencie os dispositivos com acesso à sua conta."
        actions={
          outrasAtivas.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmRevokeAll(true)}
            disabled={revokingAll}
          >
            {revokingAll
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <ShieldAlert className="h-4 w-4 mr-2" />}
            Revogar outras sessões
          </Button>
          )
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sessoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <Monitor className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Sessões ativas */}
          {ativas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ativas</CardTitle>
                <CardDescription>Sessões com acesso atual à sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {ativas.map((s, i) => (
                  <div key={s.id}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Monitor className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {s.isCurrent ? 'Este dispositivo' : 'Dispositivo'}
                            </span>
                            {s.isCurrent && (
                              <Badge variant="default" className="text-xs">Atual</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Login em {formatDate(s.criadoEm)} · Expira em {formatDate(s.expiresAt)}
                          </p>
                        </div>
                      </div>
                      {s.isCurrent ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={signOut}
                          className="shrink-0"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sair
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevoke(s.id)}
                          disabled={revoking === s.id}
                        >
                          {revoking === s.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : 'Revogar'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Sessões inativas */}
          {inativas.length > 0 && (
            <Card className="opacity-70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground">Inativas / Expiradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {inativas.map((s, i) => (
                  <div key={s.id}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Dispositivo</p>
                        <p className="text-xs text-muted-foreground">
                          Login em {formatDate(s.criadoEm)} ·{' '}
                          {isExpired(s.expiresAt) ? 'Expirada' : 'Revogada'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {isExpired(s.expiresAt) ? 'Expirada' : 'Revogada'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar outras sessões?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os outros dispositivos serão desconectados imediatamente.
              Sua sessão atual permanece ativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revogar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FadeIn>
  )
}
