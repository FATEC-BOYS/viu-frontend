'use client'

import { useState } from 'react'
import Link from 'next/link'
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

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setMsg(null)

    try {
      await api.post('/auth/forgot-password', { email })
    } catch {
      // resposta deliberadamente ambígua — não revela se o e-mail existe
    } finally {
      setMsg('Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.')
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
          <CardDescription>Informe seu e-mail para receber o link de redefinição.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
              />
            </div>

            {msg && (
              <p className="text-sm text-center text-muted-foreground" aria-live="polite">
                {msg}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
