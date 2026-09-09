/**
 * Leitura dos erros que o backend devolve.
 *
 * Um 403 pode ser duas coisas muito diferentes na tela: "isto não é seu" e
 * "confirme seu e-mail primeiro". A primeira é um beco sem saída; a segunda
 * tem um próximo passo claro. Por isso o backend manda `codigo` no corpo — e
 * é ele que decide aqui, não o texto da mensagem, que muda com a redação.
 */

export const CODIGO_EMAIL_NAO_VERIFICADO = 'EMAIL_NAO_VERIFICADO'

export function ehEmailNaoVerificado(erro: unknown): boolean {
  const corpo = (erro as { body?: { codigo?: string } } | null | undefined)?.body
  return corpo?.codigo === CODIGO_EMAIL_NAO_VERIFICADO
}

/** Rota que explica o próximo passo e permite reenviar o link. */
export function rotaDeVerificacao(email?: string | null): string {
  return email ? `/verificar-email?email=${encodeURIComponent(email)}` : '/verificar-email'
}
