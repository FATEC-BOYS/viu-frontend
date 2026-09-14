import Link from 'next/link'
import { LinkIcon, Clock, Ban, Eye } from 'lucide-react'

/**
 * A tela de quando o link não abre.
 *
 * Antes isto era `notFound()` — página em branco, igual para revogado,
 * expirado, limite atingido e token que nunca existiu. O backend distinguia os
 * quatro e jogava fora antes de responder; o front jogava fora o que sobrava.
 *
 * O efeito era o cliente abrindo no celular, vendo nada, e voltando para o
 * WhatsApp dizendo "não abriu" — sem o designer saber qual dos casos tinha
 * sido, e sem ninguém saber o que fazer a respeito.
 *
 * Cada motivo tem um próximo passo diferente, e é isso que a tela diz.
 */

export type MotivoLinkIndisponivel =
  | 'NAO_ENCONTRADO'
  | 'REVOGADO'
  | 'EXPIRADO'
  | 'LIMITE_ATINGIDO'
  | 'TIPO_NAO_SUPORTADO'

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function conteudo(motivo: MotivoLinkIndisponivel, expiraEm: string | null) {
  switch (motivo) {
    case 'EXPIRADO':
      return {
        icone: Clock,
        titulo: expiraEm ? `Este link expirou em ${dataCurta(expiraEm)}` : 'Este link expirou',
        // O próximo passo é sempre com o designer: o cliente não tem como
        // renovar nada sozinho, e mandá-lo "tentar de novo" seria cruel.
        ajuda: 'Peça um link novo para quem enviou a arte. O trabalho continua lá.',
      }
    case 'REVOGADO':
      return {
        icone: Ban,
        titulo: 'Este link foi desativado',
        ajuda: 'Quem enviou a arte encerrou o acesso por este link. Fale com essa pessoa para receber outro.',
      }
    case 'LIMITE_ATINGIDO':
      return {
        icone: Eye,
        titulo: 'Este link atingiu o limite de aberturas',
        ajuda: 'Ele foi criado com um número máximo de acessos. Peça um novo a quem enviou a arte.',
      }
    // NAO_ENCONTRADO e TIPO_NAO_SUPORTADO caem juntos de propósito: para quem
    // está do outro lado, "endereço errado" e "tipo de link que não abre aqui"
    // levam à mesma ação, e inventar duas telas não ajudaria ninguém.
    default:
      return {
        icone: LinkIcon,
        titulo: 'Não encontramos esta arte',
        ajuda: 'O endereço pode estar incompleto. Confira se o link foi copiado inteiro, ou peça outro a quem enviou.',
      }
  }
}

export default function LinkIndisponivel({
  motivo,
  expiraEm = null,
}: {
  motivo: MotivoLinkIndisponivel
  expiraEm?: string | null
}) {
  const { icone: Icone, titulo, ajuda } = conteudo(motivo, expiraEm)

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <Icone className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="text-balance text-lg font-semibold">{titulo}</h1>
        <p className="text-pretty text-sm text-muted-foreground">{ajuda}</p>
        {/*
          Uma saída, e só uma. Quem chegou aqui provavelmente não tem conta no
          VIU — oferecer "entrar" seria mandá-lo para outra porta fechada.
        */}
        <Link
          href="/"
          className="inline-block text-sm font-medium underline underline-offset-2"
        >
          Conhecer o VIU
        </Link>
      </div>
    </main>
  )
}
