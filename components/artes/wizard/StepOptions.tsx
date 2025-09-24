"use client";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Copy } from "lucide-react";
import { buildShareUrl } from "./helpers";

type Props = {
  notificarAoEnviar: boolean;
  setNotificarAoEnviar: (b: boolean) => void;
  gerarLinkPublico: boolean;
  setGerarLinkPublico: (b: boolean) => void;
  somenteLeitura: boolean;
  setSomenteLeitura: (b: boolean) => void;
  expiraDias: number;
  setExpiraDias: (n: number) => void;
  preToken: string | null;
  setPreToken: (s: string | null) => void;
};

export default function StepOptions({
  notificarAoEnviar, setNotificarAoEnviar,
  gerarLinkPublico, setGerarLinkPublico,
  somenteLeitura, setSomenteLeitura,
  expiraDias, setExpiraDias,
  preToken, setPreToken,
}: Props) {

  const shareUrl = useMemo(() => (preToken ? buildShareUrl(preToken) : ""), [preToken]);

  function handleToggle(checked: boolean) {
    setGerarLinkPublico(checked);
    if (checked && !preToken) {
      const t = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setPreToken(t);
    }
    if (!checked) setPreToken(null);
  }

  async function copyToClipboard() {
    if (!shareUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {}
  }

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
          <Switch checked={gerarLinkPublico} onCheckedChange={handleToggle} />
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

            {preToken && (
              <div className="space-y-1">
                <Label>Link</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={shareUrl} className="flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={copyToClipboard} title="Copiar">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => shareUrl && window.open(shareUrl, "_blank")}>
                    Abrir
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" /> Será criado ao clicar em “Criar”.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
