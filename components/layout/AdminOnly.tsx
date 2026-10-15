'use client'
import { useAuth } from '@/contexts/AuthContext'
import { podeVerFinanceiro } from '@/lib/financeiro'

/** Não monta os filhos para os demais papéis, incluindo sessão em carregamento. */
export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return podeVerFinanceiro(user?.tipo) ? <>{children}</> : null
}
