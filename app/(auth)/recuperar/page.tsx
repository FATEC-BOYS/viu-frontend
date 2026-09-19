'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { MailCheck } from 'lucide-react'

function RecuperarPageConteudo() {
  /*
   * `?email=` vem da tela de cadastro, quando ela descobre que já existe conta
   * com aquele endereço. Sem isto a pessoa acabava de digitar o e-mail e teria
   * que digitar de novo — no passo em que ela já está confusa por ter sido
   * recusada num cadastro que nunca pediu.
   */
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      await api.post('/auth/forgot-password', { email })
    } catch {
      // resposta deliberadamente ambígua — não revela se o e-mail existe
    } finally {
      setSending(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <MailCheck className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifique seu e-mail</CardTitle>
            <CardDescription>
              Se <strong>{email}</strong> estiver cadastrado, você receberá um link
              de redefinição em breve. Verifique também a pasta de spam.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Voltar para o login
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <Card className="w-full max-w-md">
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

/*
 * `useSearchParams` exige fronteira de Suspense no App Router — mesmo padrão
 * que a tela de login já usa.
 */
export default function RecuperarPage() {
  return (
    <Suspense>
      <RecuperarPageConteudo />
    </Suspense>
  )
}
