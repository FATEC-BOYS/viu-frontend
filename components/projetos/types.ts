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
export function orderLabel(o: "criado_em" | "prazo" | "nome") {
  return o === "prazo" ? "Prazo" : o === "criado_em" ? "Criação" : "Nome";
}
