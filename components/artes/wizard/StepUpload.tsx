"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Upload, FileCheck2 } from "lucide-react";
import { ACCEPT_ARTE, FORMATOS_ACEITOS, formatoDoArquivo, rotuloDoArquivo } from "./helpers";

type Props = {
  busy: boolean;
  file: File | null;
  setFile: (f: File | null) => void;
  setErr: (m: string | null) => void;
  onPreview: (url: string | null) => void;
};

/**
 * O passo do arquivo.
 *
 * Antes o passo anterior perguntava o formato e este conferia — e recusava
 * quando não batia. A pergunta não ia para lugar nenhum: o `FormData` nunca
 * enviou o formato declarado, e o backend grava `tipo` a partir do mimetype do
 * arquivo de verdade. A pergunta existia só para validar o arquivo contra ela
 * mesma, então o erro que ela produzia era inventado.
 *
 * Agora o formato é LIDO do arquivo e mostrado — "Você selecionou PNG" — em vez
 * de pedido antes. O que sobra de validação é o que o servidor realmente exige:
 * estar entre os formatos aceitos.
 */
export default function StepUpload({ busy, file, setFile, setErr, onPreview }: Props) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  /**
   * Um caminho só para o clique e para o arraste.
   *
   * O texto prometia "arraste e solte" desde sempre e o componente não tinha
   * handler nenhum: soltar um arquivo em cima não fazia nada, e a área dizia
   * que fazia.
   */
  function receber(f: File | null) {
    setErr(null);
    setFile(null);
    setLocalPreview(null);
    onPreview(null);
    if (!f) return;

    const formato = formatoDoArquivo(f);
    if (!formato) {
      // Nomeia o que a pessoa escolheu e o que serve — recusa que não diz
      // nenhum dos dois obriga a adivinhar.
      setErr(`Você selecionou ${rotuloDoArquivo(f)}, que não é um formato aceito. Aceitos: ${FORMATOS_ACEITOS}.`);
      return;
    }

    const preview = f.type?.startsWith("image/") ? URL.createObjectURL(f) : null;
    setLocalPreview(preview);
    onPreview(preview);
    setFile(f);
  }

  const formato = file ? formatoDoArquivo(file) : null;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (busy) return;
          receber(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
          arrastando ? "border-primary bg-primary/5" : ""
        }`}
      >
        <Upload className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          Arraste e solte um arquivo ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground mb-3">{FORMATOS_ACEITOS}</p>
        <Input
          type="file"
          disabled={busy}
          /* Filtra o diálogo do sistema: escolher o que não serve deixa de ser
             o caminho normal, em vez de virar erro depois. */
          accept={ACCEPT_ARTE}
          onChange={(e) => receber(e.target.files?.[0] ?? null)}
        />

        {file && formato && (
          /* "Você selecionou PNG" — o formato dito de volta, lido do arquivo.
             É a confirmação que faltava, e é o que a pergunta do passo anterior
             tentava obter perguntando. */
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm">
            <FileCheck2 className="h-4 w-4 text-emerald-600" aria-hidden />
            <span>
              Você selecionou <span className="font-medium">{formato.label}</span>
              <span className="text-muted-foreground"> — {file.name}</span>
            </span>
          </p>
        )}

        {localPreview && (
          <div className="mt-4">
            <img src={localPreview} alt="preview" className="max-h-48 mx-auto rounded-md object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
