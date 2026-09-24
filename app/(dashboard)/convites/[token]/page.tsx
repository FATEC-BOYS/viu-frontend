'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, FolderOpen, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/layout/PageHeader'
import { FadeIn } from '@/components/layout/Motion'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  /* Mesma razão da lista: recusar cancela o projeto de quem convidou, e é
     irreversível. Aqui pesa ainda mais — quem chegou pelo link do e-mail
     costuma estar vendo este projeto pela primeira vez. */
  const [confirmandoRecusa, setConfirmandoRecusa] = useState(false)

  const carregar = useCallback(() => {
    let ativo = true
    setCarregando(true)
    setErroDeRede(null)
    convitesApi
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
        const res = await convitesApi.aceitarPorToken(token)
        toast.success('Convite aceito!')
        router.push(res.data?.id ? `/projetos/${res.data.id}` : '/projetos')
      } else {
        await convitesApi.recusarPorToken(token)
        toast.success(`Convite recusado. O projeto "${convite?.projeto.nome ?? ''}" foi cancelado.`)
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
              onClick={() => setConfirmandoRecusa(true)}
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
      <AlertDialog open={confirmandoRecusa} onOpenChange={setConfirmandoRecusa}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar o convite de &ldquo;{convite.projeto.nome}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto é cancelado junto, e quem convidou vai precisar criar outro para tentar
              de novo. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmandoRecusa(false); responder('recusar') }}>
              Recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FadeIn>
  )
}
