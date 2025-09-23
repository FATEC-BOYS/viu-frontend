"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { MIME_OPTIONS } from "./helpers";

type Props = {
  nome: string;
  descricao: string;
  mime: string;
  setNome: (v: string) => void;
  setDescricao: (v: string) => void;
  setMime: (v: string) => void;
};

export default function StepDetails({
  nome, descricao, mime, setNome, setDescricao, setMime,
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

      <div>
        <Label>Formato do arquivo</Label>
        <Select value={mime} onValueChange={setMime}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o formato" />
          </SelectTrigger>
          <SelectContent>
            {MIME_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label} — {m.value} ({m.exts.map((e) => "." + e).join(", ")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Será verificado no próximo passo.
        </p>
      </div>
    </div>
  );
}
