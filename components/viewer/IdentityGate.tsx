"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  token: string;
  arteId: string;
  onIdentified: (viewer: { email: string; nome?: string | null }) => void;
};

export default function IdentityGate({ token, arteId, onIdentified }: Props) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    (window as any).__viu_modal_open__ = true;           // pausa atalhos globais

    // trava rolagem atrás do modal
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    try {
      const raw = localStorage.getItem("viu.viewer");
      if (raw) {
        const v = JSON.parse(raw);
        if (v?.email) onIdentified({ email: v.email, nome: v.nome });
      }
    } catch {}

    return () => {
      (window as any).__viu_modal_open__ = false;
      document.body.style.overflow = prevOverflow;
    };
  }, [onIdentified]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("viewer_identify", {
        p_token: token,
        p_arte_id: arteId,
        p_email: email,
        p_nome: nome || null,
      });
      if (error) throw error;
      localStorage.setItem("viu.viewer", JSON.stringify({ email: data.email, nome: data.nome }));
      onIdentified({ email: data.email, nome: data.nome });
    } catch (e: any) {
      setError(e?.message || "Não foi possível identificar você.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      // bloqueia que atalhos globais capturem as teclas do input
      onKeyDownCapture={(e) => e.stopPropagation()}
      onKeyUpCapture={(e) => e.stopPropagation()}
      onKeyPressCapture={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-2">Antes de comentar…</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Informe seu e-mail (e opcionalmente seu nome). Usaremos isso para associar seus feedbacks e aprovações.
        </p>

        {error && (
          <Alert className="mb-3" variant="destructive">
            <AlertTitle>Falhou</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">E-mail</label>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nome (opcional)</label>
            <Input
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button disabled={!email || submitting} onClick={handleConfirm}>
              {submitting ? "Confirmando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
