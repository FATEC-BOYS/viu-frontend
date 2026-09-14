"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  nome: string;
  descricao: string;
  setNome: (v: string) => void;
  setDescricao: (v: string) => void;
};

export default function StepDetails({
  nome, descricao, setNome, setDescricao,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Nome da arte</Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Banner - Lançamento"
        />
      </div>

      <div>
        <Label>Descrição</Label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Brief / observações"
        />
      </div>

      {/*
        Aqui havia "Formato do arquivo", com o aviso "Será verificado no próximo
        passo" — e era só isso que ele fazia. O valor nunca era enviado: o
        `FormData` leva arquivo, nome, projeto e descrição, e o backend grava
        `tipo` a partir do mimetype do arquivo de verdade.

        Pedir para a pessoa prever o formato e depois recusar o arquivo dela
        criava um erro que não precisava existir. O formato agora é lido do
        arquivo no passo seguinte e dito de volta: "Você selecionou PNG".
      */}
    </div>
  );
}
