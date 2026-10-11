"use client";
import * as React from "react";
import { buscarContatos } from "@/lib/contatos";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
  email?: string;
}

export default function AsyncUserMultiSelect({
  tipo,
  value,
  onChange,
  placeholder,
}: {
  tipo: "CLIENTE" | "DESIGNER";
  value: string[];                 // array de ids/emails
  onChange: (val: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    /*
     * Fala direto com o backend, e não mais com uma rota do Next passada por
     * prop: publicado, o servidor Next não tem o cookie da sessão e a busca
     * voltava vazia em silêncio, como se não houvesse ninguém cadastrado.
     *
     * No lugar do `AbortController` vai um sinalizador: `api` não recebe
     * signal, e o que importa é o mesmo — resposta de uma digitação velha não
     * pode sobrescrever a da atual.
     */
    let atual = true;
    const run = async () => {
      setLoading(true);
      try {
        const items = await buscarContatos(query, tipo);
        if (!atual) return;
        // `u.nome` não existe na resposta — o campo é `label`. Lendo o campo
        // errado, toda sugestão caía no e-mail mesmo tendo nome cadastrado.
        setOptions(items.map((u) => ({ id: u.id, label: u.label, email: u.email })));
      } catch (e) {
        if (atual) console.error("Search error", e);
      } finally {
        if (atual) setLoading(false);
      }
    };
    run();
    return () => { atual = false; };
  }, [query, tipo]);

  function addItem(opt: Option) {
    if (!value.includes(opt.id)) {
      onChange([...value, opt.id]);
    }
    setQuery("");
    setOptions([]);
  }

  function removeItem(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  const current = value.map((v) => ({ id: v, label: v }));

  return (
    <div className="space-y-2">
      {/* Selected items */}
      <div className="flex flex-wrap gap-2">
        {current.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
          >
            {item.label}
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => removeItem(item.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/*
        A lista vai num Popover, e não num `absolute` dentro do campo.

        Ela era filha de um container `relative` que, dentro do modal de novo
        projeto, vive no corpo rolável — e `overflow-y: auto` recorta filho
        posicionado. Medido a 1440x900: 68% da lista sumia, e a segunda pessoa
        que casava a busca era invisível. O Popover do Radix portaliza para
        fora da árvore que rola e reposiciona sozinho quando falta espaço.
      */}
      <Popover
        open={Boolean(query) && (options.length > 0 || !loading)}
        onOpenChange={(aberto) => { if (!aberto) setOptions([]); }}
      >
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              placeholder={placeholder ?? "Buscar..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={4}
          // Largura da âncora, como o `w-full` de antes. `p-0` porque o
          // padrão do componente tem padding, que aqui viraria moldura.
          className="w-[var(--radix-popover-trigger-width)] p-0"
          // Sem isto o Popover rouba o foco ao abrir e a pessoa para de
          // digitar no meio da busca.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {options.length > 0
            ? options.map((opt) => (
                <div
                  key={opt.id}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm hover:bg-accent",
                    value.includes(opt.id) && "bg-accent"
                  )}
                  onClick={() => addItem(opt)}
                >
                  {opt.label}
                  {opt.email && (
                    <span className="ml-2 text-xs text-muted-foreground">{opt.email}</span>
                  )}
                </div>
              ))
            : (
                /* adicionar direto o que foi digitado */
                <div
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => addItem({ id: query, label: query })}
                >
                  Convidar <strong>{query}</strong>
                </div>
              )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
