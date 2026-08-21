'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, FolderOpen, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/layout/PageHeader'
import { FadeIn } from '@/components/layout/Motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import {
  convitesApi,
  formatConviteStatus,
  formatExpiracao,
  type ConviteProjeto,
} from '@/lib/convites'

/**
 * Destino do link enviado por e-mail (`FRONTEND_URL/convites/:token`).
 *
 * A consulta do convite é pública de propósito: quem recebe o e-mail precisa
 * ver de que projeto se trata antes de decidir entrar na conta. Só a resposta
 * exige sessão — e a sessão tem que ser a do convidado.
 */
export default function ConvitePorTokenPage() {
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [convite, setConvite] = useState<ConviteProjeto | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [respondendo, setRespondendo] = useState<'aceitar' | 'recusar' | null>(null)

  useEffect(() => {
    let ativo = true
    convitesApi
      .getPorToken(token)
      .then((c) => {
        if (ativo) setConvite(c)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [token])

  async function responder(acao: 'aceitar' | 'recusar') {
    setRespondendo(acao)
    try {
      if (acao === 'aceitar') {
        const res = await convitesApi.aceitarPorToken(token)
        toast.success('Convite aceito!')
        router.push(res.data?.id ? `/projetos/${res.data.id}` : '/projetos')
      } else {
        await convitesApi.recusarPorToken(token)
        toast.success('Convite recusado')
        router.push('/convites')
      }
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Não foi possível responder ao convite')
      setRespondendo(null)
    }
  }

  if (carregando || authLoading) {
    return (
      <FadeIn className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando convite…
        </div>
      </FadeIn>
    )
  }

  if (!convite) {
    return (
      <FadeIn className="space-y-4 p-6">
        <PageHeader
          title="Convite inválido"
          description="Este convite não existe, já foi respondido há muito tempo ou o link está incompleto."
        />
        <Button asChild variant="outline">
          <Link href="/convites">Ver meus convites</Link>
        </Button>
      </FadeIn>
    )
  }

  const pendente = convite.status === 'PENDENTE'
  const expirado = new Date(convite.expiraEm).getTime() <= Date.now()
  const outraConta = Boolean(user && convite.convidado && user.id !== convite.convidado.id)

  return (
    <FadeIn className="space-y-6 p-6">
      <PageHeader
        title="Convite para projeto"
        description={
          convite.convidadoPor?.nome
            ? `${convite.convidadoPor.nome} convidou você para participar.`
            : 'Você foi convidado para participar de um projeto.'
        }
      />

      <Card className="max-w-xl space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
            <FolderOpen className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{convite.projeto.nome}</p>
            {convite.projeto.descricao && (
              <p className="text-sm text-muted-foreground">{convite.projeto.descricao}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {pendente && !expirado
                ? formatExpiracao(convite.expiraEm)
                : formatConviteStatus(expirado && pendente ? 'EXPIRADO' : convite.status)}
            </p>
          </div>
          {!pendente && (
            <Badge variant="outline" className="ml-auto rounded-full">
              {formatConviteStatus(convite.status)}
            </Badge>
          )}
        </div>

        {!pendente || expirado ? (
          <p className="text-sm text-muted-foreground">
            Este convite não está mais aberto. Peça um novo para quem enviou.
          </p>
        ) : !user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Entre na conta que recebeu o convite para responder.
            </p>
            <Button asChild>
              <Link href={`/login?next=/convites/${encodeURIComponent(token)}`}>
                Entrar para responder
              </Link>
            </Button>
          </div>
        ) : outraConta ? (
          <p className="text-sm text-muted-foreground">
            Este convite foi enviado para outra conta. Saia e entre com a conta que recebeu o
            e-mail.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => responder('recusar')}
              disabled={respondendo !== null}
            >
              {respondendo === 'recusar' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <X className="mr-1 h-4 w-4" aria-hidden />
              )}
              Recusar
            </Button>
            <Button onClick={() => responder('aceitar')} disabled={respondendo !== null}>
              {respondendo === 'aceitar' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="mr-1 h-4 w-4" aria-hidden />
              )}
              Aceitar convite
            </Button>
          </div>
        )}
      </Card>

      {pendente && !expirado && (
        <p className="text-xs text-muted-foreground">
          Recusar um convite cancela o projeto — ele só existe a partir do aceite das duas partes.
        </p>
      )}
    </FadeIn>
  )
}
