import { api } from './api'

/**
 * Entrar na conta de outra pessoa, como administrador — somente leitura.
 *
 * O backend recusa qualquer escrita nessa sessão, e recusa no middleware por
 * onde toda rota passa, não numa lista de rotas. Estas funções só abrem e
 * fecham o acesso; o que o suporte precisa FAZER continua nas rotas de admin,
 * agindo em nome do admin, com o nome e a data certos.
 */

export interface UsuarioBasico {
  id: string
  nome: string
  email: string
  tipo: string
}

export const impersonacaoApi = {
  /** Abre a sessão de leitura na conta do usuário. O cookie é trocado pelo backend. */
  async entrar(usuarioId: string): Promise<{ usuario: UsuarioBasico; expiraEm: string }> {
    const res = await api.post<{ data: { usuario: UsuarioBasico; expiraEm: string } }>(
      `/admin/impersonar/${usuarioId}`,
      {},
    )
    return res.data
  },

  /** Fecha e devolve o admin à própria conta. */
  async sair(): Promise<{ usuario: UsuarioBasico }> {
    const res = await api.post<{ data: { usuario: UsuarioBasico } }>('/admin/impersonar/sair', {})
    return res.data
  },
}
