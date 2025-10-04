import type { Projeto } from "@/lib/projects";

export type StatusFiltro = "todos" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
export type Mode = "cards" | "board" | "calendar";

export function statusLabel(s: Projeto["status"]) {
  return s === "EM_ANDAMENTO" ? "Em andamento" : s === "CONCLUIDO" ? "Concluído" : "Pausado";
}
export function orderLabel(o: "criado_em" | "prazo" | "nome") {
  return o === "prazo" ? "Prazo" : o === "criado_em" ? "Criação" : "Nome";
}
