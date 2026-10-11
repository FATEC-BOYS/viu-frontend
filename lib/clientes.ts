import { api } from '@/lib/api';
import { quandoPorExtenso } from '@/lib/prazos';
import { diasAte, formatarDia } from '@/lib/diaDeCalendario';

/**
 * O estado do trabalho com um cliente.
 *
 * Mora fora de `app/(dashboard)/clientes/[id]/page.tsx` porque um arquivo de
 * página do Next não pode exportar nada além do componente — `next build` no
 * webpack recusa. É também o que deixa a frase de estado ser testada, que é a
 * parte com regra de verdade.
 */

/*
 * Os quatro estados que o servidor aceita — `UpdateProjetoRequestSchema` tem
 * os quatro, e a tela do projeto tem botão para cancelar. O tipo listava três,
 * e um tipo que descreve um mundo menor que o do servidor não protege nada:
 * só esconde o quarto caso de quem lê o código.
 */
export type ProjetoStatus = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PAUSADO' | 'CANCELADO';

/**
 * Projeto encerrado: não espera entrega, qualquer que tenha sido o desfecho.
 *
 * Cancelado guarda o `prazo` que tinha — nada o apaga —, então perguntar só
 * "não está concluído?" faz um projeto que foi CHAMADO DE VOLTA aparecer como
 * atraso a cobrar. `PainelDoCliente` já tira o cancelado da lista do cliente;
 * aqui a regra é a mesma, dita uma vez e usada pelas duas telas.
 *
 * Pausado fica de fora desta lista de propósito: pausado volta.
 */
const ENCERRADO: ReadonlySet<ProjetoStatus> = new Set(['CONCLUIDO', 'CANCELADO']);

const esperaEntrega = (p: ProjetoDoCliente) => !ENCERRADO.has(p.status);

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
  // Cinza como o concluído: os dois acabaram, e a palavra ao lado diz como.
  CANCELADO: 'bg-border',
};

export const ROTULO: Record<ProjetoStatus, string> = {
  EM_ANDAMENTO: 'em andamento',
  PAUSADO: 'pausado',
  CONCLUIDO: 'concluído',
  CANCELADO: 'cancelado',
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

  const abertos = projetos.filter(esperaEntrega);
  /*
   * `diasAte` em vez de `new Date(prazo) < meia-noite local`.
   *
   * O prazo é um DIA que viaja como instante UTC à meia-noite. Comparar esse
   * instante com a meia-noite de quem olha dá certo quase sempre e erra
   * exatamente na borda: em São Paulo, `2026-09-12T00:00:00Z` é 21h de 11/09,
   * menor que a meia-noite de 12/09 — e o prazo que vence HOJE era anunciado
   * como vencido. `diasAte` conta dias de calendário, que é o que a palavra
   * "prazo" quer dizer aqui.
   */
  const atrasados = abertos.filter((p) => p.prazo && diasAte(p.prazo) < 0);

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
    /*
     * "Entregue" conta só o que foi CONCLUÍDO. Cancelado também encerra, mas
     * encerra do outro jeito — e chamar de entrega um projeto que o cliente
     * chamou de volta é a mesma mentira de chamá-lo de atraso, invertida.
     */
    const entregues = projetos.filter((p) => p.status === 'CONCLUIDO').length;
    if (entregues === 0) {
      return projetos.length === 1
        ? 'Projeto cancelado. Nada em aberto.'
        : 'Nenhum projeto em aberto.';
    }
    if (entregues === projetos.length) {
      return entregues === 1
        ? 'Projeto entregue. Nada em aberto.'
        : `${entregues} projetos entregues. Nada em aberto.`;
    }
    return `${entregues} ${entregues === 1 ? 'projeto entregue' : 'projetos entregues'}. Nada em aberto.`;
  }
  return abertos.length === 1 ? 'Um projeto em aberto, sem prazo marcado.' : `${abertos.length} projetos em aberto, sem prazo marcado.`;
}

export type PrazoEmAberto = {
  /** O dia já escrito, sem deslocamento de fuso. */
  dia: string;
  atrasado: boolean;
};

/**
 * O prazo que decide o próximo passo com esta pessoa — e se ele já passou.
 *
 * Existe para o CARTÃO da lista, que tinha a sua própria conta: pegava o
 * primeiro prazo entre os projetos `EM_ANDAMENTO` e desenhava a data crua.
 * Eram três divergências com `recadoDoCliente`, que fala do mesmo cliente uma
 * tela adiante:
 *
 *   · o pausado sumia. `recadoDoCliente` conta tudo que não está concluído, e
 *     um projeto pausado com prazo estourado é justamente o que precisa de
 *     atenção — pausado não é entregue;
 *   · a data andava um dia para trás no Brasil, porque `new Date(iso)` resolve
 *     a meia-noite UTC no fuso de quem olha. Medido: 30/09 no cartão contra
 *     01/10 em `/prazos`, para o mesmo projeto;
 *   · e o atraso não era dito. O cartão mostrava "01/10/2025" com a mesma cara
 *     de um prazo que vence mês que vem, enquanto o detalhe do mesmo cliente
 *     dizia "Um projeto com o prazo vencido · atrasado há 375 dias".
 *
 * Agora as duas telas leem daqui, então não têm de onde divergir.
 */
export function prazoEmAberto(projetos: ProjetoDoCliente[]): PrazoEmAberto | null {
  const comPrazo = projetos.filter((p) => esperaEntrega(p) && p.prazo);
  if (comPrazo.length === 0) return null;

  // O mais próximo primeiro: se algum passou, é ele quem aparece.
  const proximo = [...comPrazo].sort((a, b) => a.prazo!.localeCompare(b.prazo!))[0];
  return { dia: formatarDia(proximo.prazo!), atrasado: diasAte(proximo.prazo!) < 0 };
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
