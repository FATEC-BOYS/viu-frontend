'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, Users2, X } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/layout/PageHeader'
import { FadeIn } from '@/components/layout/Motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import {
  convitesEquipeApi,
  formatConviteStatus,
  formatExpiracao,
  type ConviteEquipe,
} from '@/lib/convites'
import { formatPapel } from '@/lib/equipes'

/**
 * Destino do link enviado por e-mail (`FRONTEND_URL/equipes/convites/:token`).
 *
 * Mesma lógica do convite de projeto: a consulta é pública, a resposta exige
 * estar na conta convidada. A diferença é o papel proposto, que faz parte da
 * decisão e por isso aparece antes do aceite.
 */
export default function ConviteEquipePorTokenPage() {
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [convite, setConvite] = useState<ConviteEquipe | null>(null)
  const [carregando, setCarregando] = useState(true)
  /*
   * Convite que não existe é uma coisa; rede que oscilou é outra.
   *
   * A busca não tinha `.catch`: qualquer falha deixava o estado nulo, e nulo
   * desenha "Convite inválido — este convite não existe". Quem chegou pelo
   * link do e-mail não tem outro caminho, então uma oscilação de rede
   * encerrava o assunto: a pessoa conclui que perdeu o convite e vai embora.
   */
  const [erroDeRede, setErroDeRede] = useState<string | null>(null)
  const [respondendo, setRespondendo] = useState<'aceitar' | 'recusar' | null>(null)

  const carregar = useCallback(() => {
    let ativo = true
    setCarregando(true)
    setErroDeRede(null)
    convitesEquipeApi
      .getPorToken(token)
      .then((c) => {
        if (ativo) setConvite(c)
      })
      .catch((e: unknown) => {
        if (!ativo) return
        const status = (e as { status?: number })?.status
        /*
         * 404 e 410 são o convite mesmo: inexistente ou já respondido. Aí a
         * tela de "convite inválido" é a verdade. Qualquer outra falha é da
         * viagem, e tentar de novo resolve.
         */
        if (status === 404 || status === 410) return
        setErroDeRede((e as Error)?.message ?? 'Não foi possível carregar o convite.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [token])

  useEffect(carregar, [carregar])

  async function responder(acao: 'aceitar' | 'recusar') {
    setRespondendo(acao)
    try {
      if (acao === 'aceitar') {
        const res = await convitesEquipeApi.aceitarPorToken(token)
        toast.success('Convite aceito! Você agora é membro da equipe.')
        router.push(res.data?.id ? `/equipes/${res.data.id}` : '/equipes')
      } else {
        await convitesEquipeApi.recusarPorToken(token)
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

  if (erroDeRede) {
    return (
      <FadeIn className="space-y-4 p-6">
        <PageHeader
          title="Não foi possível carregar o convite"
          description={erroDeRede}
        />
        <div className="flex gap-2">
          <Button onClick={carregar}>Tentar de novo</Button>
          <Button asChild variant="outline">
            <Link href="/convites">Ver meus convites</Link>
          </Button>
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
        title="Convite para equipe"
        description={
          convite.convidadoPor?.nome
            ? `${convite.convidadoPor.nome} convidou você para a equipe.`
            : 'Você foi convidado para uma equipe.'
        }
      />

      <Card className="max-w-xl space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
            <Users2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              {convite.equipe.nome}
              <Badge variant="outline" className="rounded-full">
                {formatPapel(convite.papel)}
              </Badge>
            </p>
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
            Este convite não está mais aberto. Peça um novo para a liderança da equipe.
          </p>
        ) : !user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Entre na conta que recebeu o convite para responder.
            </p>
            <Button asChild>
              <Link href={`/login?next=/equipes/convites/${encodeURIComponent(token)}`}>
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
              Entrar na equipe
            </Button>
          </div>
        )}
      </Card>
    </FadeIn>
  )
}
