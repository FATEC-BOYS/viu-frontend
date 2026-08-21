"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { equipesApi, type Equipe } from "@/lib/equipes";

/**
 * Seleção da equipe de um projeto.
 *
 * O backend aceita `equipeId` em POST/PUT /projetos desde o agrupamento
 * visual, mas não havia nenhum campo na interface — dava para ter equipe via
 * API e não pela tela. As equipes vêm de GET /equipes, que já devolve só as do
 * usuário, então uma lista simples basta: quem tem dezenas de equipes é a
 * exceção, não a regra.
 */
const SEM_EQUIPE = "__sem_equipe__";

export default function EquipeSelect({
  value,
  onChange,
  id,
  disabled,
}: {
  value: string | null;
  onChange: (equipeId: string | null) => void;
  id?: string;
  disabled?: boolean;
}) {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    equipesApi
      .listar()
      .then((lista) => {
        if (ativo) setEquipes(lista);
      })
      .catch(() => {
        // Sem equipe é um estado válido; falhar aqui não pode travar o formulário.
        if (ativo) setEquipes([]);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <Select
      value={value ?? SEM_EQUIPE}
      onValueChange={(v) => onChange(v === SEM_EQUIPE ? null : v)}
      disabled={disabled || carregando}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={carregando ? "Carregando equipes…" : "Sem equipe"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEM_EQUIPE}>Sem equipe</SelectItem>
        {equipes.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
