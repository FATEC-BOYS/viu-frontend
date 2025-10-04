"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Check, X } from "lucide-react";

type CreatePayload = {
  titulo: string;
  prazo?: string | null; // yyyy-mm-dd
};

export default function TaskInlineComposer({
  onCreate,
  autoFocus = false,
  compact = false,
}: {
  onCreate: (values: CreatePayload) => void | Promise<void>;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && autoFocus) inputRef.current?.focus();
  }, [open, autoFocus]);

  const reset = useCallback(() => {
    setTitulo("");
    setPrazo("");
  }, []);

  const handleSubmit = useCallback(async () => {
    const name = titulo.trim();
    if (!name) return;
    await onCreate({ titulo: name, prazo: prazo || null });
    reset();
    setOpen(false);
  }, [onCreate, prazo, reset, titulo]);

  if (!open) {
    return (
      <button
        className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
        onClick={() => setOpen(true)}
      >
        + Nova tarefa
      </button>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className={compact ? "p-2" : "p-3"}>
        <div className="flex flex-col gap-2">
          <Input
            ref={inputRef}
            placeholder="Título da tarefa…"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") { reset(); setOpen(false); }
            }}
          />

          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="pr-8"
              />
              <CalendarPlus className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="outline" onClick={() => { reset(); setOpen(false); }}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={!titulo.trim()}>
                <Check className="h-4 w-4 mr-1" /> Criar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
