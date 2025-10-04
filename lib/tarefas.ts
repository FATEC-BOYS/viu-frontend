export const statusLabel: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const prioridadeLabel: Record<string, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export function daysDiffFromToday(dateISO: string | null) {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  const t = new Date();
  d.setHours(0,0,0,0); t.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

export const prioridadeOrder: Record<string, number> = { ALTA: 3, MEDIA: 2, BAIXA: 1 };
export const statusOrder: Record<string, number> = { PENDENTE: 1, EM_ANDAMENTO: 2, CONCLUIDA: 3, CANCELADA: 4 };

export const formatDateBR = (dateISO: string | null) =>
  dateISO ? new Date(dateISO).toLocaleDateString("pt-BR") : "Sem prazo";
