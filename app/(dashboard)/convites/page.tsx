'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FolderOpen, Loader2, MailOpen, Users2, X } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/layout/EmptyState'
import { FadeIn } from '@/components/layout/Motion'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  /** Quais listagens não vieram — vazio quando as duas chegaram. */
  const [naoCarregou, setNaoCarregou] = useState<string[]>([])
  const [recusando, setRecusando] = useState<
    { tipo: 'projeto'; convite: ConviteProjeto } | { tipo: 'equipe'; convite: ConviteEquipe } | null
  >(null)

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

      /*
       * Falha parcial precisa aparecer.
       *
       * O aviso só saía quando as DUAS listagens falhavam. Se só a de equipes
       * caísse, a tela mostrava os convites de projeto e ficava calada sobre o
       * resto — e quem estava esperando um convite de equipe concluía que ele
       * não chegou. Uma lista que faltou não se distingue de uma lista vazia
       * se ninguém disser qual é o caso.
       */
      const falharam = [
        resProjetos.status === 'rejected' ? 'de projeto' : null,
        resEquipes.status === 'rejected' ? 'de equipe' : null,
      ].filter(Boolean) as string[]
      setNaoCarregou(falharam)
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
        // Diz o efeito, porque ele não é óbvio pelo nome do botão.
        toast.success(`Convite recusado. O projeto "${convite.projeto.nome}" foi cancelado.`)
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

      {/*
        * Dito acima das listas, e não num toast que some: a ausência de uma
        * listagem é uma informação que continua valendo enquanto a pessoa
        * olha a tela.
        */}
      {naoCarregou.length > 0 && !carregando && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="flex-1 text-sm text-amber-700 dark:text-amber-300">
            Não foi possível carregar seus convites {naoCarregou.join(' e ')}. O que está abaixo
            pode estar incompleto.
          </p>
          <Button size="sm" variant="outline" onClick={carregar}>
            Tentar de novo
          </Button>
        </div>
      )}

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
                      onRecusar={() => setRecusando({ tipo: 'projeto', convite })}
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
                      onRecusar={() => setRecusando({ tipo: 'equipe', convite })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      {/*
        * Recusar um convite de PROJETO cancela o projeto de quem convidou, e
        * não dá para desfazer: conferido no app, convidar de novo responde
        * "Convite só pode ser criado para projetos em rascunho". Um botão de
        * uma palavra colado no "Aceitar" não pode carregar esse efeito calado.
        *
        * Convite de equipe não tem esse peso — a equipe continua lá, e quem
        * convidou pode convidar de novo. A frase muda com o caso.
        */}
      <AlertDialog open={recusando !== null} onOpenChange={(v) => !v && setRecusando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {recusando?.tipo === 'projeto'
                ? `Recusar o convite de "${recusando.convite.projeto.nome}"?`
                : `Recusar o convite de "${recusando?.tipo === 'equipe' ? recusando.convite.equipe.nome : ''}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {recusando?.tipo === 'projeto'
                ? 'O projeto é cancelado junto, e quem convidou vai precisar criar outro para tentar de novo. Não dá para desfazer.'
                : 'Você não entra na equipe. Quem convidou pode te convidar de novo depois.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!recusando) return
                if (recusando.tipo === 'projeto') responderProjeto(recusando.convite, 'recusar')
                else responderEquipe(recusando.convite, 'recusar')
                setRecusando(null)
              }}
            >
              Recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
