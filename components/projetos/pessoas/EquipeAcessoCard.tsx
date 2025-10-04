"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Crown, UserPlus2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Papel =
  | "OWNER"
  | "DESIGNER"
  | "CLIENTE"
  | "APROVADOR"
  | "OBSERVADOR";

export type Participante = {
  id: string;
  nome: string;
  email?: string | null;
  avatar?: string | null;
  papel: Papel;
};

export type ConviteRow = {
  id: string;
  email: string;
  papel: Papel;
  status: "PENDENTE" | "ACEITO" | "CANCELADO" | "EXPIRADO";
  criado_em: string;
};

function Grupo({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: Participante[];
  emptyHint?: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium mb-2">{title}</div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
            <Avatar className="h-8 w-8">
              {p.avatar ? (
                <AvatarImage src={p.avatar} alt={p.nome} />
              ) : (
                <AvatarFallback className="text-[10px]">
                  {p.nome.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{p.nome}</div>
              <div className="text-xs text-muted-foreground truncate">
                {p.email ?? "—"}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {!items.length && (
        <div className="text-xs text-muted-foreground border rounded-md p-3 mt-1">
          {emptyHint ?? "Sem pessoas neste grupo."}
        </div>
      )}
    </div>
  );
}

export default function EquipeAcessoCard({
  participantes,
  convites,
  onGerenciar,
}: {
  participantes: Participante[];
  convites: ConviteRow[];
  onGerenciar: () => void;
}) {
  const owner = participantes.find((p) => p.papel === "OWNER");

  const designers = participantes.filter((p) => p.papel === "DESIGNER");
  const clientes = participantes.filter((p) => p.papel === "CLIENTE");
  const aprovadores = participantes.filter((p) => p.papel === "APROVADOR");
  const observadores = participantes.filter((p) => p.papel === "OBSERVADOR");

  const pendentes = convites.filter((c) => c.status === "PENDENTE");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Equipe & Acesso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Owner */}
        <div className="flex items-center gap-3">
          <Crown className="h-4 w-4 text-yellow-600" />
          <div className="text-sm">
            Owner:{" "}
            <span className="font-medium">
              {owner ? owner.nome : "—"}
            </span>
          </div>
          {owner?.email && (
            <Badge variant="outline" className="rounded-full ml-2">
              {owner.email}
            </Badge>
          )}
        </div>

        <Grupo title="Designers" items={designers} emptyHint="Convide designers para colaborar." />
        <Grupo title="Clientes" items={clientes} emptyHint="Adicione clientes que vão acompanhar o projeto." />
        <Grupo title="Aprovadores" items={aprovadores} emptyHint="Marque quem pode aprovar as artes." />
        <Grupo title="Observadores" items={observadores} emptyHint="Pessoas que só visualizam." />

        {/* Convites pendentes */}
        <div>
          <div className="text-xs font-medium mb-2 flex items-center gap-1">
            <UserPlus2 className="h-3.5 w-3.5" />
            Convites pendentes
          </div>
          <ul className={cn("grid sm:grid-cols-2 lg:grid-cols-3 gap-2", !pendentes.length && "hidden")}>
            {pendentes.map((c) => (
              <li key={c.id} className="rounded-lg border p-2 text-sm flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.papel.toLowerCase()} • {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full">pendente</Badge>
              </li>
            ))}
          </ul>
          {!pendentes.length && (
            <div className="text-xs text-muted-foreground border rounded-md p-3">
              Sem convites pendentes.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onGerenciar}>Gerenciar acessos</Button>
        </div>
      </CardContent>
    </Card>
  );
}
