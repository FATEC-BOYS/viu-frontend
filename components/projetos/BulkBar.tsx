import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Projeto } from "@/lib/projects";

export default function BulkBar({
  count,
  onClose,
  onStatus,
  onPrazo,
}: {
  count: number;
  onClose: () => void;
  onStatus: (s: Projeto["status"]) => void;
  onPrazo: (days: number) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-30">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border bg-background shadow-lg p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <strong>{count}</strong> selecionado(s)
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="sm">Mudar status</Button></PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="grid gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onStatus("EM_ANDAMENTO")}>Em andamento</Button>
                  <Button variant="ghost" size="sm" onClick={() => onStatus("PAUSADO")}>Pausado</Button>
                  <Button variant="ghost" size="sm" onClick={() => onStatus("CONCLUIDO")}>Concluído</Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="sm">Definir prazo</Button></PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="grid gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onPrazo(7)}>+7 dias</Button>
                  <Button variant="ghost" size="sm" onClick={() => onPrazo(30)}>+30 dias</Button>
                  <Button variant="ghost" size="sm" onClick={() => onPrazo(90)}>+90 dias</Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="secondary" size="sm" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
