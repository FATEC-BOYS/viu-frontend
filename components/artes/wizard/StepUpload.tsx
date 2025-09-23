"use client";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { extFromFilename, getSelectedMimeMeta, mimeMatchesSelection } from "./helpers";

type Props = {
  mime: string;
  busy: boolean;
  file: File | null;
  setFile: (f: File | null) => void;
  setErr: (m: string | null) => void;
  onPreview: (url: string | null) => void;
};

export default function StepUpload({
  mime, busy, file, setFile, setErr, onPreview,
}: Props) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed p-6 text-center">
        <Upload className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          Arraste e solte um arquivo ou clique para selecionar
        </p>
        <Input
          type="file"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setErr(null);
            setFile(null);
            setLocalPreview(null);
            onPreview(null);
            if (!f) return;

            // valida seleção vs arquivo
            if (!mimeMatchesSelection(mime, f)) {
              const meta = getSelectedMimeMeta(mime);
              const expected = meta ? `${meta.label} (${meta.exts.map((e) => "." + e).join(", ")})` : mime;
              const real = f.type || `.${extFromFilename(f.name)}`;
              setErr(`O arquivo selecionado é ${real}, mas você escolheu ${expected}.`);
              return;
            }

            const preview = f.type?.startsWith("image/") ? URL.createObjectURL(f) : null;
            setLocalPreview(preview);
            onPreview(preview);
            setFile(f);
          }}
        />
        {localPreview && (
          <div className="mt-4">
            <img src={localPreview} alt="preview" className="max-h-48 mx-auto rounded-md object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
