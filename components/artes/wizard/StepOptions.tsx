"use client";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon } from "lucide-react";

type Props = {
  notificarAoEnviar: boolean;
  setNotificarAoEnviar: (b: boolean) => void;
  gerarLinkPublico: boolean;
  setGerarLinkPublico: (b: boolean) => void;
  somenteLeitura: boolean;
  setSomenteLeitura: (b: boolean) => void;
  expiraDias: number;
  setExpiraDias: (n: number) => void;
};

export default function StepOptions({
  notificarAoEnviar, setNotificarAoEnviar,
  gerarLinkPublico, setGerarLinkPublico,
  somenteLeitura, setSomenteLeitura,
  expiraDias, setExpiraDias,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="inline-flex items-center gap-3">
          <Switch checked={notificarAoEnviar} onCheckedChange={setNotificarAoEnviar} />
          Notificar ao enviar
        </Label>
        <p className="text-xs text-muted-foreground">
          Envia uma notificação no sistema após a criação.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="inline-flex items-center gap-3">
          <Switch checked={gerarLinkPublico} onCheckedChange={setGerarLinkPublico} />
          Gerar link público
        </Label>
        <p className="text-xs text-muted-foreground">
          Cria um link com token e validade para o cliente visualizar.
        </p>

        {gerarLinkPublico && (
          <div className="mt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Expira (dias)</Label>
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
              <div className="flex items-end justify-between">
                <Label className="mr-2">Somente leitura</Label>
                <Switch checked={somenteLeitura} onCheckedChange={setSomenteLeitura} />
              </div>
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
