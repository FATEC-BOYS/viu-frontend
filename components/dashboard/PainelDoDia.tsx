'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * A primeira pergunta de quem abre o VIU é "o que precisa de mim agora?".
 *
 * O Dashboard respondia com seis cartões de peso igual — projetos, artes,
 * feedbacks, tarefas, prazos, financeiro — todos do mesmo tamanho, cada um
 * com título e um subtítulo que repetia o título. Quem chegava lia seis coisas
 * e não sabia o que fazer com nenhuma.
 *
 * Aqui a resposta é uma frase e uma ação. O que sobra desce de peso.
 */

export type Pendencia = {
  feedbacks: number
  tarefas: number
  prazoProximo?: { nome: string; dias: number } | null
  /**
   * Quem ainda não subiu nenhuma arte não tem "próxima" — tem a primeira.
   * O Dashboard passou a aparecer já no primeiro projeto, e esse estado, que
   * antes ficava escondido atrás do onboarding, virou o mais comum de todos.
   */
  temArte?: boolean
}

/** A frase é derivada do que já foi buscado — nada aqui pede dado novo. */
export function recadoDoDia(p: Pendencia, nome: string): {
  titulo: string
  detalhe: string
  acao: { label: string; href: string }
} {
  if (p.feedbacks > 0) {
    return {
      titulo:
        p.feedbacks === 1
          ? '1 feedback esperando você'
          : `${p.feedbacks} feedbacks esperando você`,
      detalhe: 'O cliente comentou e ainda não teve resposta.',
      acao: { label: 'Ver feedbacks', href: '/feedbacks' },
    }
  }
  if (p.prazoProximo && p.prazoProximo.dias <= 7) {
    const { nome: projeto, dias } = p.prazoProximo
    return {
      titulo:
        dias < 0
          ? `${projeto} passou do prazo`
          : dias === 0
            ? `${projeto} entrega hoje`
            : `${projeto} entrega em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
      detalhe: 'É o prazo mais próximo da sua fila.',
      acao: { label: 'Abrir projeto', href: '/projetos' },
    }
  }
  if (p.tarefas > 0) {
    return {
      titulo: p.tarefas === 1 ? '1 tarefa aberta' : `${p.tarefas} tarefas abertas`,
      detalhe: 'Nada de fora esperando por você — só o seu próprio roteiro.',
      acao: { label: 'Abrir projetos', href: '/projetos' },
    }
  }
  if (p.temArte === false) {
    return {
      titulo: `Tudo pronto para começar, ${nome}`,
      detalhe: 'O projeto está de pé. Falta a arte — é ela que o cliente abre e comenta.',
      acao: { label: 'Enviar primeira arte', href: '/artes?novo=1' },
    }
  }
  return {
    titulo: `Tudo em dia, ${nome}`,
    detalhe: 'Ninguém está esperando resposta sua. Bom momento para subir a próxima arte.',
    acao: { label: 'Subir arte', href: '/artes?novo=1' },
  }
}

export default function PainelDoDia({
  pendencia,
  nome,
}: {
  pendencia: Pendencia
  nome: string
}) {
  const { titulo, detalhe, acao } = recadoDoDia(pendencia, nome)

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{detalhe}</p>
      </div>
      <Button asChild className="shrink-0">
        <Link href={acao.href}>{acao.label}</Link>
      </Button>
    </section>
  )
}
