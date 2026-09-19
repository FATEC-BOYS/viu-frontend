import type { Projeto } from "@/lib/projects";

export type StatusFiltro = "todos" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
export type Mode = "cards" | "board" | "calendar";

const MODES: Mode[] = ["cards", "board", "calendar"];
const STATUS_FILTROS: StatusFiltro[] = ["todos", "EM_ANDAMENTO", "CONCLUIDO", "PAUSADO"];

/** Lê um modo de visualização vindo da URL, ignorando valor desconhecido. */
export function parseMode(valor: string | null, padrao: Mode = "cards"): Mode {
  return MODES.includes(valor as Mode) ? (valor as Mode) : padrao;
}

/** Lê um filtro de status vindo da URL, ignorando valor desconhecido. */
export function parseStatusFiltro(valor: string | null): StatusFiltro {
  return STATUS_FILTROS.includes(valor as StatusFiltro) ? (valor as StatusFiltro) : "todos";
}

export type PrazoPreset = "todos" | "7" | "30" | "90";
export type OrdemProjeto = "criado_em" | "prazo" | "nome";

const PRAZO_PRESETS: PrazoPreset[] = ["todos", "7", "30", "90"];
const ORDENS: OrdemProjeto[] = ["criado_em", "prazo", "nome"];

/*
 * Estes três leitores existem pelo mesmo motivo dos de cima, e faltavam.
 *
 * A tela espelhava só busca, status e visualização na URL — prazo, cliente e
 * ordenação ficavam só na memória do componente. O efeito de sincronia monta a
 * query do zero a cada mudança, então um endereço com `?cliente=…` era
 * APAGADO na montagem: a URL não só esquecia o filtro, ela o removia de um
 * link que alguém tinha mandado.
 *
 * O comentário do estado inicial diz que a URL existe para "voltar do detalhe
 * de um projeto não jogar a pessoa de volta na lista crua". Ela guardava
 * metade.
 */
export function parsePrazoPreset(valor: string | null): PrazoPreset {
  return PRAZO_PRESETS.includes(valor as PrazoPreset) ? (valor as PrazoPreset) : "todos";
}

export function parseOrdem(valor: string | null): OrdemProjeto {
  return ORDENS.includes(valor as OrdemProjeto) ? (valor as OrdemProjeto) : "criado_em";
}

/** Crescente só quando a URL pede. O padrão da tela é do mais novo para o mais velho. */
export function parseAscendente(valor: string | null): boolean {
  return valor === "1";
}

export interface FiltrosDeProjeto {
  busca: string;
  status: StatusFiltro;
  prazo: PrazoPreset;
  cliente: string | "todos";
  ordem: OrdemProjeto;
  ascendente: boolean;
  modo: Mode;
}

/**
 * Os filtros viram endereço.
 *
 * Função à parte, e não um trecho dentro do efeito de sincronia, porque é aqui
 * que estava o defeito: o efeito montava a query do zero e conhecia só três
 * dos sete campos. O que ele não conhecia sumia — e, pior, era APAGADO de um
 * endereço que alguém tinha mandado, porque montar do zero é reescrever.
 *
 * Com `parse*` de um lado e isto do outro, o ida-e-volta é testável: o que a
 * tela escreve, a tela relê.
 *
 * Só o que difere do padrão entra. Um endereço com `?status=todos&ordem=criado_em`
 * seria barulho que diz o mesmo que a ausência.
 */
export function queryDosFiltros(f: FiltrosDeProjeto): string {
  const params = new URLSearchParams();
  if (f.busca.trim()) params.set("q", f.busca.trim());
  if (f.status !== "todos") params.set("status", f.status);
  if (f.prazo !== "todos") params.set("prazo", f.prazo);
  if (f.cliente !== "todos") params.set("cliente", f.cliente);
  if (f.ordem !== "criado_em") params.set("ordem", f.ordem);
  if (f.ascendente) params.set("asc", "1");
  if (f.modo !== "cards") params.set("view", f.modo);
  return params.toString();
}

/** O caminho inverso: um endereço vira o estado inicial da tela. */
export function filtrosDaQuery(params: URLSearchParams): FiltrosDeProjeto {
  return {
    busca: params.get("q") ?? "",
    status: parseStatusFiltro(params.get("status")),
    prazo: parsePrazoPreset(params.get("prazo")),
    cliente: params.get("cliente") ?? "todos",
    ordem: parseOrdem(params.get("ordem")),
    ascendente: parseAscendente(params.get("asc")),
    modo: parseMode(params.get("view")),
  };
}

const STATUS_LABEL: Record<Projeto["status"], string> = {
  RASCUNHO: "Rascunho",
  EM_ANDAMENTO: "Em andamento",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export function statusLabel(s: Projeto["status"]) {
  return STATUS_LABEL[s] ?? s;
}
export function orderLabel(o: OrdemProjeto) {
  return o === "prazo" ? "Prazo" : o === "criado_em" ? "Criação" : "Nome";
}
