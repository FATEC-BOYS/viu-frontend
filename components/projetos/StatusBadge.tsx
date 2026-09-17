import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Projeto } from "@/lib/projects";
import { statusLabel } from "./types";

/**
 * O estado do projeto, sem roubar o destaque da ação.
 *
 * "Concluído" era `variant="default"` — o terracota cheio da marca, a mesma
 * cor do botão "Novo". O estado MENOS acionável da grade ficava com o maior
 * peso visual da tela, mais forte que "Em andamento", que é onde o trabalho
 * está. Agora é contornado com tinta verde no texto: continua distinguível de
 * relance, e a única coisa cheia na página volta a ser a ação.
 */
export default function StatusBadge({ status }: { status: Projeto["status"] }) {
  return (
    <Badge
      variant={status === "EM_ANDAMENTO" ? "secondary" : "outline"}
      className={cn(
        "shrink-0 text-xs",
        status === "CONCLUIDO" && "border-emerald-600/30 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}
