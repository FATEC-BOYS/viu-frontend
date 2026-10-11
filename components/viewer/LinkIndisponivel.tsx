import Link from 'next/link'
import { LinkIcon, Clock, Ban, Eye, RefreshCw } from 'lucide-react'

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
 *
 * Os quatro primeiros motivos dizem que o LINK está ruim. `FALHA_TEMPORARIA`
 * diz o contrário: o link está bom e quem falhou fomos nós. A diferença não é
 * cosmética — ela decide quem age. "Não encontramos esta arte" manda o cliente
 * cobrar um link novo de quem já mandou o certo, e o designer fica parecendo
 * desleixado por um erro que é nosso. Mais: ele nem descobre que houve erro,
 * porque do outro lado a mensagem parece um caso normal de link vencido.
 */

export type MotivoLinkIndisponivel =
  | 'NAO_ENCONTRADO'
  | 'REVOGADO'
  | 'EXPIRADO'
  | 'LIMITE_ATINGIDO'
  | 'TIPO_NAO_SUPORTADO'
  | 'FALHA_TEMPORARIA'

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
    case 'FALHA_TEMPORARIA':
      return {
        icone: RefreshCw,
        titulo: 'Não conseguimos abrir agora',
        // O único motivo em que insistir é o conselho certo: o link continua
        // válido, e quem precisa consertar algo somos nós, não o cliente.
        ajuda: 'O problema é do nosso lado, não do link que você recebeu. Tente de novo em alguns instantes.',
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
  tentarEm = null,
}: {
  motivo: MotivoLinkIndisponivel
  expiraEm?: string | null
  /** Endereço para insistir. Só faz sentido quando a falha é nossa. */
  tentarEm?: string | null
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

          A exceção é a falha temporária: ali insistir é a ação certa, e é o
          único caso em que a pessoa resolve sozinha.
        */}
        {motivo === 'FALHA_TEMPORARIA' && tentarEm ? (
          <Link
            href={tentarEm}
            prefetch={false}
            className="inline-block rounded-md border px-4 py-2 text-sm font-medium"
          >
            Tentar de novo
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-block text-sm font-medium underline underline-offset-2"
          >
            Conhecer o VIU
          </Link>
        )}
      </div>
    </main>
  )
}
