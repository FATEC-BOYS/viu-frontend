"use client";
import * as React from "react";
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
  route,
  placeholder,
}: {
  tipo: "CLIENTE" | "DESIGNER";
  value: string[];                 // array de ids/emails
  onChange: (val: string[]) => void;
  route: string;                   // ex: "/api/contacts/search"
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
    const ctrl = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${route}?q=${encodeURIComponent(query)}&tipo=${tipo}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setOptions((data.items ?? []).map((u: any) => ({
            id: u.id ?? u.email,
            label: u.nome ?? u.email,
            email: u.email,
          })));
        }
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error("Search error", e);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ctrl.abort();
  }, [query, tipo, route]);

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

      {/* Input + suggestions */}
      <div className="relative">
        <Input
          placeholder={placeholder ?? "Buscar..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {query && options.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
            {options.map((opt) => (
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
            ))}
          </div>
        )}

        {/* opção de adicionar direto */}
        {query && !loading && options.length === 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
            <div
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              onClick={() => addItem({ id: query, label: query })}
            >
              Convidar <strong>{query}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
