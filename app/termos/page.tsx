import { backendFetch } from '@/lib/serverBackend'

/**
 * O texto que a pessoa aceita ao criar a conta.
 *
 * Público e sem sessão de propósito: ninguém deveria precisar de conta para ler
 * o que vai aceitar para criar uma. O checkbox do cadastro liga para cá em
 * outra aba — mandar a pessoa embora de um formulário meio preenchido para ler
 * o documento é uma forma de escondê-lo.
 *
 * O texto vem do servidor, não de uma cópia aqui. Duas redações do mesmo
 * documento — uma na tela, outra no hash gravado no aceite — é exatamente o que
 * destruiria a prova: a pessoa concordaria com uma e o registro guardaria a
 * outra.
 */

export const dynamic = 'force-dynamic'

interface Termos {
  versao: string
  texto: string
  hash: string
  revisadoJuridicamente: boolean
}

export default async function TermosPage() {
  let termos: Termos | null = null
  try {
    const res = await backendFetch('/termos', { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      termos = json.data ?? json
    }
  } catch {
    termos = null
  }

  if (!termos) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Termos de uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar os termos agora. Tente de novo em instantes.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Termos de uso e aviso de privacidade</h1>
        <p className="text-xs text-muted-foreground">
          Versão <span className="font-mono">{termos.versao}</span>
          {' · '}
          {/* O hash truncado com o valor inteiro no title: é a prova de que o
              texto não mudou, então precisa ser conferível, não decorativo —
              mesma decisão do contrato de projeto. */}
          <span className="font-mono" title={termos.hash}>
            {termos.hash.slice(0, 12)}…
          </span>
        </p>
      </header>

      {!termos.revisadoJuridicamente && (
        /* Sai do dado, não de um texto fixo: quando a revisão chegar, o aviso
           some sozinho, sem depender de alguém lembrar de apagá-lo. */
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          Este texto ainda não passou por revisão jurídica. Ele descreve de boa-fé como a
          plataforma funciona.
        </p>
      )}

      {/* `whitespace-pre-wrap` e não markdown renderizado: o hash cobre
          exatamente estes bytes, e um texto reformatado seria um documento
          diferente do que foi assinado. */}
      <article className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
        {termos.texto}
      </article>
    </main>
  )
}
