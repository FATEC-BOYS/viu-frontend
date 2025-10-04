import { Badge } from "@/components/ui/badge";
import type { Projeto } from "@/lib/projects";
import { statusLabel } from "./types";

export default function StatusBadge({ status }: { status: Projeto["status"] }) {
  const variant = status === "EM_ANDAMENTO" ? "secondary" : status === "CONCLUIDO" ? "default" : "outline";
  return <Badge variant={variant} className="text-xs">{statusLabel(status)}</Badge>;
}
