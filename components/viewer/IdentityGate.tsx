"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  // chave única (se quiser separar por arte/link)
  const LS_KEY = "viu.viewer"; // ou `viu.viewer:${arteId}`

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const v = JSON.parse(raw);
        if (v?.email) onIdentified({ email: v.email, nome: v.nome ?? null });
      } catch {
        /* ignore */
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const e = email.trim();
      const n = nome.trim() || null;

      if (!isValidEmail(e)) {
        throw new Error("Informe um e-mail válido.");
      }

      // Não chamamos mais RPC aqui. Só persistimos localmente
      localStorage.setItem(LS_KEY, JSON.stringify({ email: e, nome: n }));
      onIdentified({ email: e, nome: n });
    } catch (e: any) {
      setError(e?.message || "Não foi possível identificar você.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-sm">
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
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidEmail(email) && !submitting) {
                  handleConfirm();
                }
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nome (opcional)</label>
            <Input
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidEmail(email) && !submitting) {
                  handleConfirm();
                }
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button disabled={!isValidEmail(email) || submitting} onClick={handleConfirm}>
              {submitting ? "Confirmando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
