/**
 * Deep link de WhatsApp para mandar o link de revisão ao cliente.
 *
 * Nada aqui fala com o servidor: o wa.me é só uma URL. O que esta camada faz é
 * garantir que ela não saia quebrada — um link errado enviado ao cliente é
 * pior do que botão nenhum, porque o designer acha que enviou.
 */

export type ResultadoLink =
  | { ok: true; url: string }
  | { ok: false; motivo: 'telefone-vazio' | 'telefone-invalido' | 'link-invalido' }

/**
 * Normaliza um telefone brasileiro para o formato que o wa.me espera
 * (dígitos com código do país, sem `+`).
 *
 * A decisão é pelo TAMANHO, nunca pelo prefixo. DDD 55 existe (Santa Maria/RS),
 * então `5599998888` é um número local de 10 dígitos, não um número que já
 * tenha código do país. Um `startsWith('55')` ingênuo mandaria mensagem para
 * o telefone errado, em silêncio.
 *
 *   10 ou 11 dígitos  → nacional, ganha o 55
 *   12 ou 13 com 55   → já tem código do país
 *   qualquer outro    → não dá para adivinhar; recusa
 */
export function normalizarTelefone(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '')

  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) return digitos

  return null
}

/** Só http(s) vira link clicável — bloqueia `javascript:` e afins. */
function urlDeRevisaoValida(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * `*asterisco*` é negrito no WhatsApp. A quebra dupla antes do link evita que
 * alguns clientes engulam a URL no meio da frase ao gerar o preview.
 */
export function montarMensagem(projectName: string, reviewUrl: string): string {
  const nome = projectName.trim() || 'seu projeto'
  return `Olá! 👋 O projeto *${nome}* está pronto para revisão.\n\nÉ só abrir o link, comentar direto na arte e aprovar quando estiver certo:\n${reviewUrl}`
}

export function generateWhatsAppLink({
  phone,
  projectName,
  reviewUrl,
}: {
  phone: string
  projectName: string
  reviewUrl: string
}): ResultadoLink {
  if (!phone.trim()) return { ok: false, motivo: 'telefone-vazio' }

  const numero = normalizarTelefone(phone)
  if (!numero) return { ok: false, motivo: 'telefone-invalido' }

  if (!urlDeRevisaoValida(reviewUrl)) return { ok: false, motivo: 'link-invalido' }

  const texto = encodeURIComponent(montarMensagem(projectName, reviewUrl))
  return { ok: true, url: `https://wa.me/${numero}?text=${texto}` }
}

/** Mensagem de erro para a interface — uma por motivo, sem genérico. */
export const MOTIVO_LEGIVEL: Record<
  Extract<ResultadoLink, { ok: false }>['motivo'],
  string
> = {
  'telefone-vazio': 'Informe o WhatsApp do cliente para enviar o link.',
  'telefone-invalido': 'Número inválido. Use DDD + número, como (11) 91234-5678.',
  'link-invalido': 'O link de revisão ainda não está pronto.',
}
