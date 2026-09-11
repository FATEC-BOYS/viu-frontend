'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, Lock, Clock, UserPlus, FolderPlus, ImagePlus, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A trilha até a primeira entrega.
 *
 * Substitui sete cartões independentes que tinham três problemas:
 *
 * 1. Os passos "bloqueados" não bloqueavam nada. `<Button asChild disabled>`
 *    faz o Button virar o `<a>`, e âncora não tem `disabled` — o atributo era
 *    descartado e o link continuava clicável. Aqui passo travado não renderiza
 *    link nenhum: ele diz o que falta, e só.
 *
 * 2. Cada cartão consultava a API por conta própria — 14 requisições no mount
 *    para descobrir estados que se derivam uns dos outros. Agora o progresso
 *    vem de uma fonte só.
 *
 * 3. Sete cartões do mesmo tamanho não são uma trilha: são uma lista. Sem
 *    "onde estou" e "o que vem depois", não há convite para continuar. Aqui um
 *    passo por vez fica em destaque; o resto é contexto.
 *
 * Os quatro passos são os que o designer controla. Receber feedback e ser
 * aprovado dependem do cliente agir — virar isso em "passo" faria a trilha
 * travar esperando outra pessoa, com cara de tarefa não feita.
 */

type Estado = 'feito' | 'agora' | 'depois'

export interface TrilhaInicialProps {
  /** Já vêm carregados pelo dashboard — não vale buscar de novo. */
  /**
   * A trilha perguntava isso ao backend, em `GET /usuarios?tipo=CLIENTE`.
   * Essa rota é ADMIN-only — para o designer, que é o único público desta
   * trilha, ela sempre respondeu 403. O `allSettled` engolia a falha e
   * `temCliente` ficava `false` para sempre: o passo 1 nunca podia ser
   * concluído, por mais clientes que a pessoa cadastrasse, e a trilha nunca
   * chegava ao fim.
   *
   * Não existe rota de "meus clientes": a tela de Clientes também deriva de
   * projetos. Então quem sabe é quem já tem os projetos em mãos — o Dashboard.
   */
  temCliente: boolean
  temProjeto: boolean
  temArte: boolean
  /**
   * Avisa quando os quatro passos fecharam.
   *
   * O progresso dos passos 1 e 4 (cliente cadastrado, link enviado) só existe
   * aqui dentro — são duas buscas próprias. O Dashboard precisa do mesmo fato
   * para decidir se ainda mostra a trilha, e inventar uma segunda regra lá foi
   * exatamente o que quebrou antes: a trilha se dava por concluída enquanto o
   * Dashboard continuava escondido atrás de "ter projeto concluído".
   */
  aoConcluir?: () => void
  projetoId?: string
  clienteNome?: string | null
}

interface Passo {
  id: string
  titulo: string
  convite: string
  feitoTexto: string
  precisa: string
  icone: typeof UserPlus
  href: string
  rotulo: string
}

function montarPassos(projetoId?: string): Passo[] {
  return [
    {
      id: 'cliente',
      titulo: 'Cadastre seu cliente',
      convite: 'É para quem você vai mandar a arte revisar.',
      feitoTexto: 'Cliente cadastrado.',
      precisa: '',
      icone: UserPlus,
      href: '/clientes?novo=1',
      rotulo: 'Cadastrar cliente',
    },
    {
      id: 'projeto',
      titulo: 'Crie um projeto',
      convite: 'Nome, cliente e prazo. O resto dá para ajustar depois.',
      feitoTexto: 'Projeto criado.',
      precisa: 'Cadastre um cliente primeiro.',
      icone: FolderPlus,
      href: '/projetos?novo=1',
      rotulo: 'Criar projeto',
    },
    {
      id: 'arte',
      titulo: 'Envie a primeira arte',
      convite: 'Imagem ou PDF. É o que o cliente vai comentar.',
      feitoTexto: 'Arte enviada.',
      precisa: 'Crie um projeto primeiro.',
      icone: ImagePlus,
      href: projetoId ? `/projetos/${projetoId}?tab=artes` : '/artes',
      rotulo: 'Enviar arte',
    },
    {
      id: 'link',
      titulo: 'Compartilhe o link',
      convite: 'O cliente abre, comenta no ponto exato e aprova. Sem conta, sem app.',
      feitoTexto: 'Link enviado.',
      precisa: 'Envie uma arte primeiro.',
      icone: Share2,
      href: '/links',
      rotulo: 'Gerar link',
    },
  ]
}

export default function TrilhaInicial({
  temCliente,
  temProjeto,
  temArte,
  projetoId,
  clienteNome,
  aoConcluir,
}: TrilhaInicialProps) {
  const [temLink, setTemLink] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    api
      .get<{ pagination?: { total: number }; data?: unknown[] }>('/links?limit=1')
      .then((res) => {
        if (!vivo) return
        setTemLink((res.pagination?.total ?? res.data?.length ?? 0) > 0)
      })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])

  // Só depois que as duas buscas voltam: antes disso `temCliente` e `temLink`
  // são `false` por ignorância, não por falta, e avisar "concluiu" aqui seria
  // mentira ao contrário.
  const tudoFeito = !carregando && temCliente && temProjeto && temArte && temLink
  useEffect(() => {
    if (tudoFeito) aoConcluir?.()
  }, [tudoFeito, aoConcluir])

  if (carregando) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-16" />
      </div>
    )
  }

  const concluidos = [temCliente, temProjeto, temArte, temLink]
  const passos = montarPassos(projetoId)
  const totalFeitos = concluidos.filter(Boolean).length
  // O primeiro não concluído é o único em destaque: é isso que faz virar
  // trilha em vez de lista.
  const indiceAtual = concluidos.findIndex((feito) => !feito)

  if (indiceAtual === -1) return <Espera clienteNome={clienteNome} />

  return (
    <section aria-label="Primeiros passos" className="max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium">
          Passo {totalFeitos + 1} de {passos.length}
        </p>
        <div className="h-1.5 flex-1 max-w-40 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(totalFeitos / passos.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Vertical no celular, horizontal no desktop — mesma marcação, só a
          direção muda. Duas versões alternadas por CSS deixariam as duas no
          DOM, e o leitor de tela anunciaria a trilha inteira duas vezes. */}
      <ol className="relative flex flex-col gap-1 md:flex-row md:gap-4">
        {passos.map((passo, i) => {
          const estado: Estado = concluidos[i] ? 'feito' : i === indiceAtual ? 'agora' : 'depois'
          return (
            <ItemDaTrilha
              key={passo.id}
              passo={passo}
              estado={estado}
              numero={i + 1}
              ultimo={i === passos.length - 1}
            />
          )
        })}
      </ol>
    </section>
  )
}

function ItemDaTrilha({
  passo, estado, numero, ultimo,
}: { passo: Passo; estado: Estado; numero: number; ultimo: boolean }) {
  const Icone = passo.icone
  const agora = estado === 'agora'

  return (
    <li className="relative flex gap-3 sm:gap-4 md:flex-1 md:flex-col md:gap-2">
      {/* O traço é o que amarra os passos: vertical à esquerda no celular,
          horizontal entre os círculos no desktop. */}
      {!ultimo && (
        <span
          aria-hidden
          className={cn(
            'absolute left-4 top-9 -bottom-1 w-px sm:left-5',
            'md:inset-x-auto md:bottom-auto md:left-12 md:right-0 md:top-5 md:h-px md:w-auto',
            estado === 'feito' ? 'bg-primary/40' : 'bg-border',
          )}
        />
      )}

      <div
        className={cn(
          'relative z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border sm:h-10 sm:w-10 md:mt-0',
          estado === 'feito' && 'border-primary/30 bg-primary/10 text-primary',
          agora && 'border-primary bg-primary text-primary-foreground',
          estado === 'depois' && 'border-border bg-muted text-muted-foreground',
        )}
      >
        {estado === 'feito' ? (
          <Check className="h-4 w-4" />
        ) : estado === 'depois' ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Icone className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 rounded-xl pb-4 sm:pb-5 md:pb-0',
          // O cartão existe para destacar o passo da vez numa pilha vertical.
          // Lado a lado, o destaque já vem do círculo aceso e do botão — a
          // borda só deixaria uma coluna de quatro com moldura, sem motivo.
          agora && 'mb-1 border bg-card p-4 shadow-sm sm:p-5 md:mb-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none',
        )}
      >
        <h3
          className={cn(
            'font-medium leading-tight',
            agora ? 'text-base md:text-sm' : 'text-sm',
            estado === 'depois' && 'text-muted-foreground',
          )}
        >
          <span className="sr-only">Passo {numero}: </span>
          {passo.titulo}
        </h3>

        {estado === 'feito' ? (
          <p className="mt-0.5 text-sm text-muted-foreground md:text-xs">{passo.feitoTexto}</p>
        ) : agora ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground md:text-xs">{passo.convite}</p>
            <Button asChild className="mt-3 w-full sm:w-auto md:mt-2">
              <Link href={passo.href}>{passo.rotulo}</Link>
            </Button>
          </>
        ) : (
          // Passo travado não ganha link nenhum — nem desabilitado. Botão com
          // cara de morto que abre a página mesmo assim foi o defeito anterior.
          <p className="mt-0.5 text-sm text-muted-foreground md:text-xs">{passo.precisa}</p>
        )}
      </div>
    </li>
  )
}

/**
 * Depois do link enviado a bola está com o cliente. Isso é estado, não tarefa:
 * mostrar como passo pendente colocaria na conta do designer algo que ele não
 * pode fazer.
 */
function Espera({ clienteNome }: { clienteNome?: string | null }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-medium">
            {clienteNome ? `Aguardando ${clienteNome} revisar` : 'Aguardando a revisão do cliente'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O link está com {clienteNome ?? 'seu cliente'}. Quando houver comentário ou decisão,
            aparece aqui — e você recebe notificação.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/links">Ver links enviados</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/feedbacks">Feedbacks</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
