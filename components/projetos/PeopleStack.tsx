export default function PeopleStack({
  designer,
  cliente,
}: {
  designer?: { nome: string; avatar?: string } | null;
  cliente?: { nome: string; avatar?: string } | null;
}) {
  const initials = (n?: string) =>
    (n ? n.split(" ").slice(0, 2).map(s => s[0]?.toUpperCase()).join("") : "??");

  return (
    <div className="flex -space-x-2 items-center">
      {designer && (
        <span title={`Designer: ${designer.nome}`} className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs">
          {designer.avatar ? <img src={designer.avatar} alt={designer.nome} className="h-6 w-6 rounded-full object-cover" /> : initials(designer.nome)}
        </span>
      )}
      {cliente && (
        <span title={`Cliente: ${cliente.nome}`} className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs">
          {cliente.avatar ? <img src={cliente.avatar} alt={cliente.nome} className="h-6 w-6 rounded-full object-cover" /> : initials(cliente.nome)}
        </span>
      )}
    </div>
  );
}
