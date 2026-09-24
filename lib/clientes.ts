import { api } from '@/lib/api';
import { quandoPorExtenso } from '@/lib/prazos';

/**
 * O estado do trabalho com um cliente.
 *
 * Mora fora de `app/(dashboard)/clientes/[id]/page.tsx` porque um arquivo de
 * página do Next não pode exportar nada além do componente — `next build` no
 * webpack recusa. É também o que deixa a frase de estado ser testada, que é a
 * parte com regra de verdade.
 */

export type ProjetoStatus = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PAUSADO';

export type ProjetoDoCliente = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: ProjetoStatus;
  orcamento: number | null;
  prazo?: string | null;
  /* `criadoEm` é o que o servidor manda; `criado_em` sobreviveu do tempo em
     que a tela montava o objeto à mão. Os dois ficam opcionais para a
     transição não exigir tocar em tudo de uma vez. */
  criadoEm?: string;
  criado_em?: string;
};

/** A cor segue a do resto do produto: menta anda, pêssego espera, cinza acabou. */
export const PINO: Record<ProjetoStatus, string> = {
  EM_ANDAMENTO: 'bg-pastel-menta',
  PAUSADO: 'bg-pastel-pessego',
  CONCLUIDO: 'bg-border',
};

export const ROTULO: Record<ProjetoStatus, string> = {
  EM_ANDAMENTO: 'em andamento',
  PAUSADO: 'pausado',
  CONCLUIDO: 'concluído',
};

/**
 * Como está o trabalho com esta pessoa, em uma frase.
 *
 * Isto substitui cinco cartões de número, um quadro de "Bandeiras & riscos" e
 * um "Resumo do relacionamento" que repetia os mesmos números em prosa. Os
 * cinco cartões viravam cinco telas de rolagem no celular para dizer "um
 * projeto, parado".
 *
 * O atraso fala mais alto porque é a única coisa aqui que pede ação hoje.
 */
export function recadoDoCliente(projetos: ProjetoDoCliente[]): string {
  if (projetos.length === 0) return 'Nenhum projeto ainda.';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const abertos = projetos.filter((p) => p.status !== 'CONCLUIDO');
  const atrasados = abertos.filter((p) => p.prazo && new Date(p.prazo) < hoje);

  if (atrasados.length === 1) return 'Um projeto com o prazo vencido.';
  if (atrasados.length > 1) return `${atrasados.length} projetos com o prazo vencido.`;

  const proximo = abertos
    .filter((p) => p.prazo)
    .sort((a, b) => a.prazo!.localeCompare(b.prazo!))[0];
  if (proximo) {
    /*
     * `quandoPorExtenso` devolve "em 3 dias · 15/09" — o sufixo de data serve
     * na linha da lista, onde não há espaço para escrever por extenso. No meio
     * de uma frase ele vira "em 3 dias · 15/09.", e a data já aparece logo
     * abaixo, no projeto.
     */
    const quando = quandoPorExtenso(proximo.prazo!).split(' · ')[0];
    return `Próxima entrega: ${proximo.nome}, ${quando}.`;
  }

  if (abertos.length === 0) {
    return projetos.length === 1
      ? 'Projeto entregue. Nada em aberto.'
      : `${projetos.length} projetos entregues. Nada em aberto.`;
  }
  return abertos.length === 1 ? 'Um projeto em aberto, sem prazo marcado.' : `${abertos.length} projetos em aberto, sem prazo marcado.`;
}


// ===== A CARTEIRA, VINDA DO SERVIDOR =====

/**
 * As duas telas de cliente montavam a carteira no navegador, a partir de
 * `getAll('/projetos')` — que pagina de cem em cem até vinte páginas. Para
 * desenhar uma lista de cinco pessoas, o app baixava todos os projetos do
 * designer, e `getAll` parava na vigésima página sem avisar: passando de dois
 * mil projetos, um cliente sumia da carteira e `/clientes/[id]` afirmava
 * "Cliente não encontrado na sua carteira" sobre alguém que está lá.
 *
 * Agora quem responde é o banco, que tem o índice. A regra do que é "meu
 * cliente" — ter projeto comigo — continua a mesma; mudou quem a executa.
 */

export type Cliente = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar: string | null;
  /** Laço rompido vem resolvido do servidor — era uma segunda requisição
   *  e um Set montado na tela. */
  vinculado: boolean;
  criadoEm: string;
  projetos: ProjetoDoCliente[];
};

export const clientesApi = {
  listar: () => api.get<{ data: Cliente[] }>('/clientes').then((r) => r.data ?? []),

  /**
   * 404 quando não há projeto em comum: para este designer, esse cliente não
   * existe. O erro sobe com `status`, e a tela distingue isso de uma falha de
   * rede — que é a diferença entre "não é seu cliente" e "tente de novo".
   */
  get: (id: string) => api.get<{ data: Cliente }>(`/clientes/${id}`).then((r) => r.data),

  romperVinculo: (clienteId: string) => api.put(`/vinculos/${clienteId}/romper`, {}),
  restaurarVinculo: (clienteId: string) => api.put(`/vinculos/${clienteId}/restaurar`, {}),
};
