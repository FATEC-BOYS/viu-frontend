'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * "Não fui eu" — o destino do link no e-mail de quem foi cadastrado sem pedir.
 *
 * Quando o designer cadastra o cliente pelo wizard, a conta nasce por decisão
 * de outra pessoa. O e-mail diz quem fez e por quê; esta tela é o que faz a
 * saída existir de verdade, em vez de depender de alguém do suporte ler um
 * pedido e apagar à mão.
 *
 * Não remove no carregamento da página: pré-carregador de e-mail e antivírus
 * abrem links sozinhos, e uma conta apagada por um robô de inbox seria
 * exatamente o oposto do que esta tela existe para dar. Quem remove é o
 * clique.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Estado =
  | { fase: 'pronto' }
  | { fase: 'enviando' }
  | { fase: 'removido'; projetos: number }
  | { fase: 'bloqueado'; mensagem: string }
  | { fase: 'invalido'; mensagem: string }

function Conteudo() {
  const token = useSearchParams().get('token') ?? ''
  const [estado, setEstado] = useState<Estado>({ fase: 'pronto' })

  async function recusar() {
    setEstado({ fase: 'enviando' })
    try {
      const res = await fetch(`${BASE_URL}/conta/recusar-cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const corpo = await res.json().catch(() => ({}))

      if (res.ok) {
        setEstado({ fase: 'removido', projetos: corpo?.data?.projetosAfetados ?? 0 })
        return
      }
      // 409: a conta tem histórico e a remoção deixa de ser automática.
      if (corpo?.codigo === 'RECUSA_BLOQUEADA') {
        setEstado({ fase: 'bloqueado', mensagem: corpo.message })
        return
      }
      setEstado({
        fase: 'invalido',
        mensagem: corpo?.message ?? 'Este link não vale mais.',
      })
    } catch {
      setEstado({
        fase: 'invalido',
        mensagem: 'Não consegui falar com o servidor. Tente de novo em instantes.',
      })
    }
  }

  if (!token) {
    return (
      <Moldura titulo="Link incompleto">
        <p className="text-sm text-muted-foreground">
          Este endereço não traz o código do e-mail. Abra o link direto da mensagem que você
          recebeu.
        </p>
      </Moldura>
    )
  }

  if (estado.fase === 'removido') {
    return (
      <Moldura titulo="Pronto — seus dados foram removidos">
        <p className="text-sm text-muted-foreground">
          A conta criada com o seu e-mail foi apagada e você não vai receber mais nada do VIU
          por causa dela.
          {estado.projetos > 0
            ? ' Avisamos quem tinha te colocado em um projeto.'
            : ''}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Se um dia quiser usar o VIU, pode se cadastrar normalmente com este mesmo e-mail.
        </p>
      </Moldura>
    )
  }

  if (estado.fase === 'bloqueado') {
    return (
      <Moldura titulo="Esta conta não pode ser removida automaticamente">
        <p className="text-sm text-muted-foreground">{estado.mensagem}</p>
        <Button asChild className="mt-4 h-11">
          <a href="mailto:suporte@viu.app?subject=Remo%C3%A7%C3%A3o%20de%20conta">
            Falar com o suporte
          </a>
        </Button>
      </Moldura>
    )
  }

  if (estado.fase === 'invalido') {
    return (
      <Moldura titulo="Este link não vale mais">
        <p className="text-sm text-muted-foreground">{estado.mensagem}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Links de remoção valem por 7 dias. Se já usou este, os dados já foram removidos.
        </p>
      </Moldura>
    )
  }

  return (
    <Moldura
      titulo="Remover meus dados do VIU"
      apoio="Alguém cadastrou uma conta com o seu e-mail. Se não foi você, remova agora."
    >
      <p className="text-sm text-muted-foreground">
        Vamos apagar o nome, o e-mail e o telefone associados a essa conta. É definitivo, e
        você para de receber qualquer mensagem do VIU por causa dela.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          className="h-11"
          disabled={estado.fase === 'enviando'}
          onClick={recusar}
        >
          {estado.fase === 'enviando' ? 'Removendo…' : 'Sim, não fui eu — remover'}
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href="/login">Na verdade, era eu</Link>
        </Button>
      </div>
    </Moldura>
  )
}

function Moldura({
  titulo,
  apoio,
  children,
}: {
  titulo: string
  apoio?: string
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-md">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{titulo}</CardTitle>
          {apoio ? <CardDescription>{apoio}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

export default function RecusarCadastroPage() {
  // `useSearchParams` exige fronteira de Suspense no App Router.
  return (
    <Suspense>
      <Conteudo />
    </Suspense>
  )
}
