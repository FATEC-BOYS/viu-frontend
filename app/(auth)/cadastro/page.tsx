// app/cadastro/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// Importando componentes do Shadcn/ui
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CadastroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // PASSO 1: TENTATIVA MAIS SIMPLES POSSÍVEL
    // Apenas email e senha, sem dados extras.
    // Isso não vai tentar inserir nada na sua tabela 'usuarios'.
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    setLoading(false)

    if (error) {
      // Se ainda der erro aqui, o problema é mais fundamental.
      setMessage('Erro: ' + error.message)
      return
    }

    if (data.user) {
      // SUCESSO! O usuário foi criado no sistema de autenticação.
      setMessage('Usuário criado com sucesso! Agora você pode fazer login.')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Criar Conta (Teste Simplificado)</CardTitle>
          <CardDescription>
            Apenas e-mail e senha para isolar o problema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCadastro} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Testando...' : 'Criar Usuário de Teste'}
            </Button>
            {message && (
              <p className="text-sm text-center text-red-600 pt-4">{message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


