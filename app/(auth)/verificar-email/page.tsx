'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MailCheck, MailX, Loader2, Mail } from 'lucide-react'

type Status = 'idle' | 'verifying' | 'success' | 'error'

function VerificarEmailContent() {
  const search = useSearchParams()
  const token = search.get('token')

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Resend form
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!token) return

    api.get<{ success: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch((err: any) => {
        setErrorMsg(err?.message ?? 'Link inválido ou expirado.')
        setStatus('error')
      })
  }, [token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setResending(true)
    try {
      await api.post('/auth/resend-verification', { email })
    } catch {
      // anti-enumeração — sempre a mesma resposta
    } finally {
      setResending(false)
      setResent(true)
    }
  }

  // Verificando token...
  if (status === 'verifying') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Verificando...</CardTitle>
            <CardDescription>Aguarde enquanto confirmamos seu e-mail.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Verificado com sucesso
  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <MailCheck className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">E-mail confirmado!</CardTitle>
            <CardDescription>
              Sua conta está ativa. Faça login para começar a usar o VIU.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/login">Fazer login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Token inválido / expirado
  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <MailX className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Link inválido</CardTitle>
            <CardDescription>{errorMsg} Solicite um novo link abaixo.</CardDescription>
          </CardHeader>
          <CardContent>
            {resent ? (
              <p className="text-sm text-center text-muted-foreground">
                Se o e-mail estiver pendente de verificação, você receberá um novo link em breve.
              </p>
            ) : (
              <form onSubmit={handleResend} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Seu e-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={resending}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resending}>
                  {resending ? 'Enviando...' : 'Reenviar link de verificação'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:underline">
              Voltar para o login
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Sem token — mostrado após o cadastro
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verifique seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação para o e-mail cadastrado. Clique nele para
            ativar sua conta. Verifique também a pasta de spam.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resent ? (
            <p className="text-sm text-center text-muted-foreground">
              Novo link enviado. Verifique sua caixa de entrada.
            </p>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Não recebeu? Reenviar para:</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={resending}
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={resending}>
                {resending ? 'Enviando...' : 'Reenviar link'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <Link href="/login" className="text-muted-foreground hover:underline">
            Já verificou? Fazer login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerificarEmailContent />
    </Suspense>
  )
}
