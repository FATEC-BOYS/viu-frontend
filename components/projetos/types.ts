import type { Projeto } from "@/lib/projects";

export type StatusFiltro = "todos" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
export type Mode = "cards" | "board" | "calendar";

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
