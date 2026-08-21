'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FolderOpen, Loader2, MailOpen, Users2, X } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/layout/EmptyState'
import { FadeIn } from '@/components/layout/Motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  convitesApi,
  convitesEquipeApi,
  formatExpiracao,
  type ConviteEquipe,
  type ConviteProjeto,
} from '@/lib/convites'
import { formatPapel } from '@/lib/equipes'

type Respondendo = { id: string; acao: 'aceitar' | 'recusar' } | null

export default function ConvitesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [projetos, setProjetos] = useState<ConviteProjeto[]>([])
  const [equipes, setEquipes] = useState<ConviteEquipe[]>([])
  const [carregando, setCarregando] = useState(true)
  const [respondendo, setRespondendo] = useState<Respondendo>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/convites')
  }, [authLoading, user, router])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      // Uma listagem não pode derrubar a outra: convite de equipe e de projeto
      // são independentes, e o usuário pode ter só um dos dois.
      const [resProjetos, resEquipes] = await Promise.allSettled([
        convitesApi.listarPendentes(),
        convitesEquipeApi.listarPendentes(),
      ])
      if (resProjetos.status === 'fulfilled') setProjetos(resProjetos.value)
      if (resEquipes.status === 'fulfilled') setEquipes(resEquipes.value)
      if (resProjetos.status === 'rejected' && resEquipes.status === 'rejected') {
        toast.error('Não foi possível carregar seus convites')
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (user) carregar()
  }, [user, carregar])

  async function responderProjeto(convite: ConviteProjeto, acao: 'aceitar' | 'recusar') {
    setRespondendo({ id: convite.id, acao })
    try {
      if (acao === 'aceitar') {
        await convitesApi.aceitarPorId(convite.id)
        toast.success(`Você entrou no projeto "${convite.projeto.nome}"`)
      } else {
        await convitesApi.recusarPorId(convite.id)
        toast.success('Convite recusado')
      }
      setProjetos((atual) => atual.filter((c) => c.id !== convite.id))
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Não foi possível responder ao convite')
    } finally {
      setRespondendo(null)
    }
  }

  async function responderEquipe(convite: ConviteEquipe, acao: 'aceitar' | 'recusar') {
    setRespondendo({ id: convite.id, acao })
    try {
      if (acao === 'aceitar') {
        await convitesEquipeApi.aceitarPorId(convite.id)
        toast.success(`Você entrou na equipe "${convite.equipe.nome}"`)
      } else {
        await convitesEquipeApi.recusarPorId(convite.id)
        toast.success('Convite recusado')
      }
      setEquipes((atual) => atual.filter((c) => c.id !== convite.id))
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Não foi possível responder ao convite')
    } finally {
      setRespondendo(null)
    }
  }

  const vazio = projetos.length === 0 && equipes.length === 0

  return (
    <FadeIn className="space-y-6 p-6">
      <PageHeader
        title="Convites"
        description="Convites de projeto e de equipe aguardando sua resposta."
      />

      {carregando || authLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando convites…
        </div>
      ) : vazio ? (
        <EmptyState
          icon={MailOpen}
          title="Nenhum convite pendente"
          description="Quando alguém convidar você para um projeto ou equipe, o convite aparece aqui — e também chega por e-mail."
        />
      ) : (
        <div className="space-y-8">
          {projetos.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FolderOpen className="h-4 w-4" aria-hidden />
                Projetos
              </h2>
              <ul className="grid gap-3">
                {projetos.map((convite) => (
                  <li
                    key={convite.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">{convite.projeto.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {convite.convidadoPor?.nome
                          ? `Convite de ${convite.convidadoPor.nome}`
                          : 'Convite de projeto'}
                        {' • '}
                        {formatExpiracao(convite.expiraEm)}
                      </p>
                      {convite.projeto.descricao && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {convite.projeto.descricao}
                        </p>
                      )}
                    </div>
                    <AcoesConvite
                      ocupado={respondendo?.id === convite.id ? respondendo.acao : null}
                      onAceitar={() => responderProjeto(convite, 'aceitar')}
                      onRecusar={() => responderProjeto(convite, 'recusar')}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {equipes.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users2 className="h-4 w-4" aria-hidden />
                Equipes
              </h2>
              <ul className="grid gap-3">
                {equipes.map((convite) => (
                  <li
                    key={convite.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {convite.equipe.nome}
                        <Badge variant="outline" className="rounded-full">
                          {formatPapel(convite.papel)}
                        </Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {convite.convidadoPor?.nome
                          ? `Convite de ${convite.convidadoPor.nome}`
                          : 'Convite de equipe'}
                        {' • '}
                        {formatExpiracao(convite.expiraEm)}
                      </p>
                    </div>
                    <AcoesConvite
                      ocupado={respondendo?.id === convite.id ? respondendo.acao : null}
                      onAceitar={() => responderEquipe(convite, 'aceitar')}
                      onRecusar={() => responderEquipe(convite, 'recusar')}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </FadeIn>
  )
}

function AcoesConvite({
  ocupado,
  onAceitar,
  onRecusar,
}: {
  ocupado: 'aceitar' | 'recusar' | null
  onAceitar: () => void
  onRecusar: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onRecusar} disabled={ocupado !== null}>
        {ocupado === 'recusar' ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <X className="mr-1 h-4 w-4" aria-hidden />
        )}
        Recusar
      </Button>
      <Button size="sm" onClick={onAceitar} disabled={ocupado !== null}>
        {ocupado === 'aceitar' ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Check className="mr-1 h-4 w-4" aria-hidden />
        )}
        Aceitar
      </Button>
    </div>
  )
}
