import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { iniciais } from "@/lib/iniciais";

/**
 * Pilha de avatares designer + cliente.
 *
 * Antes usava <img> cru: quando a URL do avatar falhava aparecia o ícone de
 * imagem quebrada em vez das iniciais. E o -space-x-2 em círculo de 24px fazia
 * o segundo avatar cobrir o texto do primeiro.
 */
export default function PeopleStack({
  designer,
  cliente,
}: {
  designer?: { nome: string; avatar?: string } | null;
  cliente?: { nome: string; avatar?: string } | null;
}) {
  const pessoas = [
    designer && { papel: "Designer", ...designer },
    cliente && { papel: "Cliente", ...cliente },
  ].filter(Boolean) as Array<{ papel: string; nome: string; avatar?: string }>;

  return (
    <div className="flex -space-x-1 items-center">
      {pessoas.map((p) => (
        <Avatar
          key={`${p.papel}-${p.nome}`}
          title={`${p.papel}: ${p.nome}`}
          className="h-6 w-6 ring-2 ring-background"
        >
          <AvatarImage src={p.avatar || undefined} alt={p.nome} className="object-cover" />
          <AvatarFallback className="bg-muted text-[10px] font-medium">
            {iniciais(p.nome)}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}
