import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackPanel } from "@/components/feedback/FeedbackPanel";
import { ImageIcon, FolderOpen, PlusCircle } from "lucide-react";
import { useState } from "react";

interface ArteItem {
  id: string;
  nome: string;
  status: string;
  versao: number;
}
interface Projeto {
  id: string;
  nome: string;
  artes: ArteItem[];
}

const MOCK: Projeto[] = [
  {
    id: "p1",
    nome: "Campanha Primavera",
    artes: [
      { id: "a1", nome: "Banner Site", status: "EM_ANALISE", versao: 3 },
      { id: "a2", nome: "Post Instagram", status: "APROVADO", versao: 1 },
    ],
  },
  {
    id: "p2",
    nome: "Identidade Visual - Loja XYZ",
    artes: [{ id: "a3", nome: "Logo v2", status: "REVISAO", versao: 2 }],
  },
];

export default function Dashboard() {
  const [projetoAtivo, setProjetoAtivo] = useState<Projeto>(MOCK[0]);
  const [arteAtiva, setArteAtiva] = useState<ArteItem>(MOCK[0].artes[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projetos</CardTitle>
            <CardDescription>Gerencie seus projetos e artes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK.map((p) => (
              <button
                key={p.id}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${p.id === projetoAtivo.id ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"}`}
                onClick={() => {
                  setProjetoAtivo(p);
                  setArteAtiva(p.artes[0]);
                }}
              >
                <div className="font-medium">{p.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {p.artes.length} artes
                </div>
              </button>
            ))}
            <Button variant="outline" className="w-full gap-2 mt-2">
              <PlusCircle className="size-4" />
              Novo projeto
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Artes</CardTitle>
            <CardDescription>{projetoAtivo.nome}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {projetoAtivo.artes.map((a) => (
              <button
                key={a.id}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${a.id === arteAtiva.id ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"}`}
                onClick={() => setArteAtiva(a)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.nome}</span>
                  <span className="text-xs">v{a.versao}</span>
                </div>
                <div className="text-xs text-muted-foreground">{a.status}</div>
              </button>
            ))}
            <Button variant="outline" className="w-full gap-2 mt-2">
              <FolderOpen className="size-4" />
              Enviar arte
            </Button>
          </CardContent>
        </Card>
      </aside>

      <section className="lg:col-span-9 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{arteAtiva.nome}</CardTitle>
            <CardDescription>
              Status: {arteAtiva.status} • Versão {arteAtiva.versao}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-md border grid place-items-center bg-gradient-to-br from-indigo-50 to-fuchsia-50 text-muted-foreground">
              <div className="flex flex-col items-center">
                <ImageIcon className="size-8 mb-2" />
                <p>Pré-visualização da arte</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback do cliente</CardTitle>
            <CardDescription>
              Grave um áudio ou escreva seu comentário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackPanel
              onSubmit={async (p) => {
                const toBase64 = (blob: Blob) =>
                  new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(String(reader.result));
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });

                const audioBase64 = p.audio
                  ? await toBase64(p.audio)
                  : undefined;
                const resp = await fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    text: p.text,
                    audioBase64,
                    arteId: arteAtiva.id,
                  }),
                });
                if (resp.ok) {
                  const data = await resp.json();
                  console.log("Feedback salvo", data);
                  alert("Feedback enviado!");
                } else {
                  const err = await resp.json().catch(() => ({}));
                  alert(
                    `Falha ao enviar feedback: ${err.error || resp.statusText}`,
                  );
                }
              }}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
