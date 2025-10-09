// components/viewer/FeedbackPanel.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import IdentityGate from "./IdentityGate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Feedback = {
  id: string;
  conteudo: string | null;
  tipo: "TEXTO" | "AUDIO";
  arquivo: string | null;
  criado_em: string;
  arte_versao_id: number;
  autor_externo_id: string | null;
};

export default function FeedbackPanel({
  arteId,
  token,
  initialFeedbacks,
  readOnly,
}: {
  arteId: string;
  token: string;
  initialFeedbacks: Feedback[];
  readOnly: boolean;
}) {
  const [viewer, setViewer] = useState<{ email: string; nome?: string | null } | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  // linha do tempo por versão (mais recente em cima)
  const porVersao = useMemo(() => {
    const groups = new Map<number, Feedback[]>();
    feedbacks.forEach((f) => {
      const arr = groups.get(f.arte_versao_id) || [];
      arr.push(f);
      groups.set(f.arte_versao_id, arr);
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([versao, arr]) => ({ versao, itens: arr.sort((a, b) => +new Date(a.criado_em) - +new Date(b.criado_em)) }));
  }, [feedbacks]);

  // “todo mundo VIU / aprovadores”
  const [viu, setViu] = useState<boolean>(false);
  const [aprovado, setAprovado] = useState<boolean>(false);

  useEffect(() => {
    // se já tem viewer salvo (IdentityGate também faz isso), carregar estado visto/aprovação
    const raw = localStorage.getItem("viu.viewer");
    if (raw && !viewer) {
      try { setViewer(JSON.parse(raw)); } catch {}
    }
  }, [viewer]);

  async function marcarViu(aprovar?: boolean) {
    if (!viewer) return;
    const { data, error } = await supabase.rpc("viewer_mark_seen_and_approve", {
      p_token: token,
      p_arte_id: arteId,
      p_email: viewer.email,
      p_aprovar: typeof aprovar === "boolean" ? aprovar : null,
    });
    if (!error && Array.isArray(data) && data[0]) {
      setViu(!!data[0].visto);
      setAprovado(!!data[0].aprovado);
    }
  }

  async function enviarTexto() {
    if (readOnly || !viewer || !text.trim()) return;
    setPosting(true);
    try {
      const { data, error } = await supabase.rpc("viewer_add_feedback", {
        p_token: token,
        p_arte_id: arteId,
        p_email: viewer.email,
        p_conteudo: text.trim(),
        p_tipo: "TEXTO",
        p_arquivo: null,
        p_posicao_x: null,
        p_posicao_y: null,
      });
      if (error) throw error;
      setFeedbacks((prev) => [data as any, ...prev]); // adiciona na memória
      setText("");
    } catch (e) {
      // TODO: toast
    } finally {
      setPosting(false);
    }
  }

  return (
    <aside className="space-y-4">
      {!viewer && (
        <IdentityGate
          token={token}
          arteId={arteId}
          onIdentified={(v) => setViewer(v)}
        />
      )}

      {/* Aprovação / “todo mundo VIU” */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Reconhecimento</p>
          <div className="text-xs text-muted-foreground">versão atual</div>
        </div>
        <div className="flex gap-2">
          <Button variant={viu ? "default" : "outline"} size="sm" disabled={!viewer} onClick={() => marcarViu()}>
            {viu ? "Você já viu" : "Marcar como visto"}
          </Button>
          <Button
            variant={aprovado ? "default" : "outline"}
            size="sm"
            disabled={!viewer}
            onClick={() => marcarViu(!aprovado)}
          >
            {aprovado ? "Aprovado por você" : "Aprovar esta versão"}
          </Button>
        </div>
      </div>

      {/* Timeline por versão */}
      <div className="space-y-4">
        {porVersao.map(({ versao, itens }) => (
          <div key={versao} className="rounded-lg border">
            <div className="px-3 py-2 border-b text-xs text-muted-foreground">
              Versão v{versao}
            </div>
            <div className="p-3 space-y-3">
              {itens.map((f) => (
                <div key={f.id} className="text-sm">
                  <div className="text-muted-foreground text-[12px]">
                    {new Date(f.criado_em).toLocaleString("pt-BR")}
                  </div>
                  <div className="whitespace-pre-wrap">{f.conteudo || "—"}</div>
                </div>
              ))}
              {itens.length === 0 && <div className="text-xs text-muted-foreground">Sem mensagens.</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Caixa de envio */}
      <div className="rounded-lg border p-3">
        <p className="text-sm font-medium mb-2">Escreva um comentário</p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={readOnly ? "Este link é somente leitura" : "Seu comentário…"}
          disabled={readOnly || !viewer}
        />
        <div className="flex justify-end pt-2">
          <Button onClick={enviarTexto} disabled={readOnly || !viewer || posting}>
            {posting ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
