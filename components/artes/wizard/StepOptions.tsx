"use client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon } from "lucide-react";

type Props = {
  gerarLinkPublico: boolean;
  setGerarLinkPublico: (b: boolean) => void;
  somenteLeitura: boolean;
  setSomenteLeitura: (b: boolean) => void;
  expiraDias: number;
  setExpiraDias: (n: number) => void;
};

export default function StepOptions({
  gerarLinkPublico, setGerarLinkPublico,
  somenteLeitura, setSomenteLeitura,
  expiraDias, setExpiraDias,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="inline-flex items-center gap-3">
          <Switch checked={gerarLinkPublico} onCheckedChange={setGerarLinkPublico} />
          Criar link de compartilhamento
        </Label>
        <p className="text-xs text-muted-foreground">
          Compartilhe a arte e escolha o que a pessoa pode fazer pelo link.
        </p>

        {gerarLinkPublico && (
          <div className="mt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Validade do link (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={expiraDias}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    const safe = Number.isFinite(n) ? n : 7;
                    setExpiraDias(Math.min(365, Math.max(1, safe)));
                  }}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Permissão do link</legend>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" name="permissaoLink" checked={somenteLeitura} onChange={() => setSomenteLeitura(true)} className="mt-1" />
                  <span>Apenas visualizar<span className="block text-xs text-muted-foreground">Permite ver a arte e os comentários, sem enviar novos comentários.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" name="permissaoLink" checked={!somenteLeitura} onChange={() => setSomenteLeitura(false)} className="mt-1" />
                  <span>Revisar e comentar<span className="block text-xs text-muted-foreground">Permite enviar comentários por texto ou áudio após entrar na conta.</span></span>
                </label>
              </fieldset>
            </div>

            {/*
              * Aqui havia um campo "Link" com Copiar e Abrir, preenchido com
              * um token inventado no navegador (`crypto.randomUUID()`). Quem
              * é dono do token é o servidor, e ele gera outro — então aquele
              * endereço nunca existiu: "Abrir" dava 404 e "Copiar" entregava
              * um link morto, que a pessoa podia mandar para o cliente.
              *
              * O link real aparece depois de "Criar", que é quando ele passa
              * a existir.
              */}
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5" /> O link aparece aqui depois de “Criar”.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
