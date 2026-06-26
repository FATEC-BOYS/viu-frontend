'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function validatePassword(pwd: string): string | null {
  if (pwd.length < 12) return 'A senha deve ter pelo menos 12 caracteres.'
  if (!/[a-z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra minúscula.'
  if (!/[A-Z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra maiúscula.'
  if (!/[0-9]/.test(pwd)) return 'A senha deve conter pelo menos um número.'
  if (!/[^a-zA-Z0-9]/.test(pwd)) return 'A senha deve conter pelo menos um caractere especial (!@#$%^&*).'
  return null
}

function ResetPasswordForm() {
  const router = useRouter()
  const search = useSearchParams()
  const token = search.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Link inválido</CardTitle>
            <CardDescription>
              Este link de redefinição é inválido ou expirou. Solicite um novo.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <a href="/recuperar" className="text-primary hover:underline text-sm">
              Solicitar novo link
            </a>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setIsError(false)

    const pwdError = validatePassword(password)
    if (pwdError) {
      setMsg(pwdError)
      setIsError(true)
      return
    }
    if (password !== confirm) {
      setMsg('As senhas não conferem.')
      setIsError(true)
      return
    }

    try {
      setSending(true)
      await api.post('/auth/reset-password', { token, password })
      setMsg('Senha redefinida com sucesso. Redirecionando…')
      setTimeout(() => router.replace('/login?reset=ok'), 1200)
    } catch (err: any) {
      setIsError(true)
      setMsg(err?.message ?? 'Não foi possível redefinir a senha. O link pode ter expirado.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Definir nova senha</CardTitle>
          <CardDescription>Crie uma nova senha forte para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={sending}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 12 caracteres, com maiúsculas, minúsculas, números e símbolos.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••••••"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={sending}
              />
            </div>

            {msg && (
              <p
                className={`text-sm text-center ${isError ? 'text-destructive' : 'text-muted-foreground'}`}
                aria-live="polite"
              >
                {msg}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <a href="/recuperar" className="text-muted-foreground hover:underline">
            Solicitar novo link
          </a>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
