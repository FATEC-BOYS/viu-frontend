"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileImage, FolderOpen, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api } from "@/lib/api";

type ResultadoProjeto = { id: string; nome: string; descricao?: string | null; status: string };
type ResultadoArte = { id: string; nome: string; descricao?: string | null; projetoId: string };

type RespostaBusca = {
  data: { projetos: ResultadoProjeto[]; artes: ResultadoArte[]; total: number };
};

// O backend recusa consultas com menos de 2 caracteres (400).
const MIN_CARACTERES = 2;
const DEBOUNCE_MS = 250;

/**
 * Busca global (Ctrl/Cmd+K).
 *
 * GET /buscar faz full-text em português sobre nome e descrição de projetos e
 * artes, e já filtra pelos projetos do usuário — mas não tinha nenhuma
 * interface: cada tela tinha só a sua busca local.
 *
 * Equipes e clientes ainda não entram aqui porque o endpoint cobre apenas
 * projetos e artes.
 */
export default function BuscaGlobal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [projetos, setProjetos] = useState<ResultadoProjeto[]>([]);
  const [artes, setArtes] = useState<ResultadoArte[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const consulta = termo.trim();
    if (consulta.length < MIN_CARACTERES) {
      setProjetos([]);
      setArtes([]);
      setCarregando(false);
      return;
    }

    let ativo = true;
    setCarregando(true);
    const id = setTimeout(async () => {
      try {
        const res = await api.get<RespostaBusca>(
          `/buscar?q=${encodeURIComponent(consulta)}&limit=5`,
        );
        if (!ativo) return;
        setProjetos(res.data?.projetos ?? []);
        setArtes(res.data?.artes ?? []);
      } catch {
        if (ativo) {
          setProjetos([]);
          setArtes([]);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      ativo = false;
      clearTimeout(id);
    };
  }, [termo]);

  const irPara = useCallback(
    (href: string) => {
      setAberto(false);
      setTermo("");
      router.push(href);
    },
    [router],
  );

  const semResultados =
    !carregando && termo.trim().length >= MIN_CARACTERES && projetos.length === 0 && artes.length === 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setAberto(true)}
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border px-1 text-[10px] sm:inline">Ctrl K</kbd>
      </Button>

      <CommandDialog
        open={aberto}
        onOpenChange={setAberto}
        title="Busca global"
        description="Procure projetos e artes por nome ou descrição."
        // A filtragem é do servidor (full-text em português); o cmdk não pode
        // esconder resultados que o ranking já escolheu.
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Buscar projetos e artes…"
          value={termo}
          onValueChange={setTermo}
        />
        <CommandList>
          {carregando && (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Buscando…
            </div>
          )}

          {termo.trim().length < MIN_CARACTERES && !carregando && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              Digite ao menos {MIN_CARACTERES} caracteres.
            </div>
          )}

          {semResultados && <CommandEmpty>Nada encontrado para “{termo.trim()}”.</CommandEmpty>}

          {projetos.length > 0 && (
            <CommandGroup heading="Projetos">
              {projetos.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`projeto-${p.id}`}
                  onSelect={() => irPara(`/projetos/${p.id}`)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" aria-hidden />
                  <span className="truncate">{p.nome}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {artes.length > 0 && (
            <CommandGroup heading="Artes">
              {artes.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`arte-${a.id}`}
                  onSelect={() => irPara(`/projetos/${a.projetoId}`)}
                >
                  <FileImage className="mr-2 h-4 w-4" aria-hidden />
                  <span className="truncate">{a.nome}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
