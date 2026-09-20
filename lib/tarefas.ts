import { formatarDia } from '@/lib/diaDeCalendario';

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

/**
 * Prazo de tarefa é dia, não instante.
 *
 * `new Date(iso).toLocaleDateString` resolvia a data no fuso de quem olha, e
 * no Brasil a meia-noite UTC de 15/09 é 21h de 14/09 local — a tarefa
 * aparecia vencendo um dia antes.
 */
export const formatDateBR = (dateISO: string | null) =>
  dateISO ? formatarDia(dateISO) : "Sem prazo";
