"use client";
import * as React from "react";
import { buscarContatos, nomeDoContato } from "@/lib/contatos";
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
  placeholder,
  label,
}: {
  tipo: "CLIENTE" | "DESIGNER";
  value: string | null;                 // id (uuid) ou email
  onChange: (val: string | null) => void;
  placeholder?: string;
  /**
   * Nome já conhecido de quem está selecionado. Quem abre este campo quase
   * sempre acabou de listar as pessoas e tem o nome na mão — sem isto o
   * componente devolvia o id à rede só para receber o nome de volta, e quando
   * essa volta falhava mostrava o id cru.
   */
  label?: string | null;
}) {
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [displayLabel, setDisplayLabel] = React.useState<string>(label ?? "");

  // 1) Sempre que o value mudar (ex.: veio do form ao editar), resolvemos o label se necessário
  React.useEffect(() => {
    let active = true;
    async function run() {
      if (!value) {
        setDisplayLabel("");
        return;
      }
      // O nome veio de fora: não há o que resolver.
      if (label) {
        setDisplayLabel(label);
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
        const nome = await nomeDoContato(value, tipo);
        if (!active) return;
        /*
         * Sem nome, o campo fica vazio e o placeholder volta a aparecer. Um id
         * no lugar do nome não é um rótulo pior — é informação errada: a pessoa
         * lê "c09e853bcf…" e não tem como saber de quem é o projeto.
         */
        setDisplayLabel(nome ?? "");
      } catch {
        setDisplayLabel("");
      } finally {
        if (active) setResolving(false);
      }
    }
    run();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, label, tipo]);

  // 2) Buscar sugestões conforme digita
  React.useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    // Sinalizador no lugar do AbortController: `api` não recebe signal, e o
    // que importa é o mesmo — resposta velha não sobrescreve a atual.
    let atual = true;
    const load = async () => {
      setLoading(true);
      try {
        const items = await buscarContatos(query, tipo);
        if (!atual) return;
        setOptions(items.map((u) => ({ id: u.id, label: u.label, email: u.email })) as Option[]);
      } catch (e) {
        if (atual) console.error("Search error", e);
      } finally {
        if (atual) setLoading(false);
      }
    };
    load();
    return () => { atual = false; };
  }, [query, tipo]);

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
