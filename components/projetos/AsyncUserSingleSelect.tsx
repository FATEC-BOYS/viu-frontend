"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Option {
  id: string;
  label: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function AsyncUserSingleSelect({
  tipo,
  value,
  onChange,
  route,
  placeholder,
  resolveRoute = "/api/contacts/resolve",
}: {
  tipo: "CLIENTE" | "DESIGNER";
  value: string | null;                 // id (uuid) ou email
  onChange: (val: string | null) => void;
  route: string;                        // ex: "/api/contacts/search"
  placeholder?: string;
  resolveRoute?: string;                // ex: "/api/contacts/resolve"
}) {
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [displayLabel, setDisplayLabel] = React.useState<string>("");

  // 1) Sempre que o value mudar (ex.: veio do form ao editar), resolvemos o label se necessário
  React.useEffect(() => {
    let active = true;
    async function run() {
      if (!value) {
        setDisplayLabel("");
        return;
      }
      // Se já temos a opção correspondente no cache atual, usa ela
      const cached = options.find((o) => o.id === value);
      if (cached) {
        setDisplayLabel(cached.label);
        return;
      }
      // Tenta resolver no servidor (somente seus contatos)
      try {
        setResolving(true);
        const res = await fetch(`${resolveRoute}?id=${encodeURIComponent(value)}&tipo=${tipo}`);
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setDisplayLabel(data?.label || String(value));
        } else {
          setDisplayLabel(String(value));
        }
      } catch {
        setDisplayLabel(String(value));
      } finally {
        if (active) setResolving(false);
      }
    }
    run();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, tipo, resolveRoute]);

  // 2) Buscar sugestões conforme digita
  React.useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const ctrl = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${route}?q=${encodeURIComponent(query)}&tipo=${tipo}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const opts = (data.items ?? []).map((u: any) => ({
            id: u.id ?? u.email,
            label: u.label ?? u.nome ?? u.email,
            email: u.email,
          })) as Option[];
          setOptions(opts);
        }
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error("Search error", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ctrl.abort();
  }, [query, tipo, route]);

  function selectItem(opt: Option) {
    onChange(opt.id);
    setDisplayLabel(opt.label);
    setQuery(opt.label);
    setOptions([]);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder={placeholder ?? "Buscar cliente..."}
          value={query !== "" ? query : (displayLabel || "")}
          onChange={(e) => setQuery(e.target.value)}
        />
        {(loading || resolving) && (
          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {query && options.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
            {options.map((opt) => (
              <div
                key={opt.id}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                onClick={() => selectItem(opt)}
              >
                {opt.label}
                {opt.email && (
                  <span className="ml-2 text-xs text-muted-foreground">{opt.email}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* opção de convidar direto (se digitou um e-mail válido e não achou nada) */}
        {query && !loading && options.length === 0 && EMAIL_RE.test(query) && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
            <div
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              onClick={() => {
                onChange(query);
                setDisplayLabel(query);
                setOptions([]);
              }}
            >
              Convidar <strong>{query}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
