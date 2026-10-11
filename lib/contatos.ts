// lib/contatos.ts
import { api } from '@/lib/api'

/**
 * Buscar e nomear pessoas nos formulários de projeto, DIRETO com o backend.
 *
 * Isto passava por `app/api/contacts/*`, rotas do Next que repassavam a
 * chamada anexando o cookie da sessão. Publicado, o servidor Next não tem
 * esse cookie — ele é host-only no domínio do backend —, então as rotas
 * respondiam `{ items: [] }` e `{ label: null }`. O efeito era silencioso e
 * por isso pior: a busca de pessoas nos formulários simplesmente não achava
 * ninguém, como se o cadastro estivesse vazio, e o cliente já escolhido
 * aparecia sem nome.
 */

const TAMANHO_PADRAO = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
// GET /usuarios/buscar exige ao menos 3 caracteres
const MINIMO_DA_BUSCA = 3

export type ContatoEncontrado = {
  id: string
  label: string
  email: string
  isPendingUser: boolean
  isNew: boolean
}

export async function buscarContatos(
  termo: string,
  tipo: 'CLIENTE' | 'DESIGNER',
  limite = TAMANHO_PADRAO,
): Promise<ContatoEncontrado[]> {
  const bruto = termo.trim()
  if (bruto.length < MINIMO_DA_BUSCA) return []

  const limit = Math.min(Math.max(limite, 1), 20)
  const ehEmail = EMAIL_RE.test(bruto)
  const q = bruto.toLowerCase()

  let encontrados: any[] = []
  try {
    // GET /usuarios é restrito a ADMIN; /usuarios/buscar é o typeahead aberto
    // a qualquer autenticado. Ele não filtra por tipo, então filtramos aqui.
    const res = await api.get<{ data?: any[] }>(
      `/usuarios/buscar?q=${encodeURIComponent(bruto)}&limit=20`,
    )
    encontrados = ((res as any)?.data ?? []).filter((u: any) => u.tipo === tipo)
  } catch {
    encontrados = []
  }

  const items: ContatoEncontrado[] = encontrados.slice(0, limit).map((u: any) => ({
    id: u.id,
    label: u.nome || u.email,
    email: u.email,
    isPendingUser: false,
    isNew: false,
  }))

  // e-mail digitado por inteiro que não existe ainda vira convite
  const temEmailExato = items.some((i) => i.email?.toLowerCase() === q)
  if (ehEmail && !temEmailExato) {
    items.unshift({ id: q, label: q, email: q, isPendingUser: true, isNew: true })
  }

  return items
}

/**
 * Traduz um id (ou e-mail) de contato para um rótulo legível.
 *
 * `GET /usuarios/:id` exige ownership, então um designer não consegue ler o
 * cadastro do próprio cliente por ali. O recurso é procurar a pessoa entre os
 * participantes dos projetos dele, que é o escopo que ele já enxerga.
 *
 * Quando nem isso acha, devolve `null` — e não o id. Devolver o id como se
 * fosse rótulo punha "c09e853bcfdce8af1a54d9534" no campo "Cliente principal"
 * do modal de novo projeto, e é justamente no primeiro projeto de um cliente
 * que a procura não tem como funcionar: ela olha os projetos existentes, e
 * ainda não há nenhum. Sem nome, quem chama decide o que mostrar.
 */
export async function nomeDoContato(
  id: string,
  tipo: 'CLIENTE' | 'DESIGNER',
): Promise<string | null> {
  const alvo = id.trim()
  if (!alvo) return null

  const rotulo = (u: any) => u?.nome || u?.email || null

  if (!EMAIL_RE.test(alvo)) {
    try {
      const res = await api.get<{ data?: any }>(`/usuarios/${encodeURIComponent(alvo)}`)
      const nome = rotulo((res as any)?.data)
      if (nome) return nome
    } catch {
      // Sem ownership: cai para a procura nos projetos.
    }
  }

  try {
    const campo = tipo === 'CLIENTE' ? 'cliente' : 'designer'
    const res = await api.get<{ data?: any[] }>('/projetos?page=1&limit=100')
    const minusculo = alvo.toLowerCase()
    const achado = ((res as any)?.data ?? [])
      .map((p: any) => p[campo])
      .find((u: any) => u && (u.id === alvo || u.email?.toLowerCase() === minusculo))
    if (achado) return rotulo(achado)
  } catch {
    // idem
  }

  return null
}
