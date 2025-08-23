import "./global.css";

import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

// Providers
import { QueryProvider } from "./lib/query-provider";
import { AuthProvider, ProtectedRoute } from "./lib/auth-context";

// Pages existentes
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import Projects from "./pages/Projects";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

// Páginas de autenticação
import Login from "./pages/Login";
import Register from "./pages/Register";

// Components
import Navbar from "./components/Navbar";

const App = () => (
  <QueryProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas (não precisa estar logado) */}
            <Route 
              path="/login" 
              element={
                <ProtectedRoute requireAuth={false} fallback={<Navigate to="/dashboard" />}>
                  <Login />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <ProtectedRoute requireAuth={false} fallback={<Navigate to="/dashboard" />}>
                  <Register />
                </ProtectedRoute>
              } 
            />
            
            {/* Rotas protegidas (precisa estar logado) */}
            <Route 
              path="/*" 
              element={
                <ProtectedRoute fallback={<Navigate to="/login" />}>
                  <AppLayout />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryProvider>
);

// Layout interno da aplicação (com Navbar)
function AppLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* Placeholder routes for features in development */}
          <Route
            path="/integrations"
            element={
              <Placeholder
                title="Integrações"
                description="Conecte o Viu com suas ferramentas favoritas de design e produtividade."
                features={[
                  "Adobe Creative Suite",
                  "Figma",
                  "Canva",
                  "Slack",
                  "Google Drive",
                  "Dropbox"
                ]}
              />
            }
          />

          <Route
            path="/features"
            element={
              <Placeholder
                title="Recursos da Plataforma"
                description="Conheça todos os recursos disponíveis no Viu para otimizar seu fluxo de trabalho."
              />
            }
          />

          <Route
            path="/pricing"
            element={
              <Placeholder
                title="Planos e Preços"
                description="Escolha o plano ideal para suas necessidades e comece a usar o Viu hoje mesmo."
              />
            }
          />

          <Route
            path="/about"
            element={
              <Placeholder
                title="Sobre o Viu"
                description="Conheça nossa missão de revolucionar a gestão de projetos criativos."
              />
            }
          />

          <Route
            path="/contact"
            element={
              <Placeholder
                title="Entre em Contato"
                description="Tire suas dúvidas ou solicite uma demonstração personalizada da plataforma."
              />
            }
          />

          <Route
            path="/help"
            element={
              <Placeholder
                title="Central de Ajuda"
                description="Encontre tutoriais, guias e respostas para as perguntas mais frequentes."
              />
            }
          />

          <Route
            path="/docs"
            element={
              <Placeholder
                title="Documentação"
                description="Documentação completa da API e guias de integração para desenvolvedores."
              />
            }
          />

          <Route
            path="/careers"
            element={
              <Placeholder
                title="Carreiras"
                description="Junte-se à nossa equipe e ajude a transformar a gestão de projetos criativos."
              />
            }
          />

          <Route
            path="/blog"
            element={
              <Placeholder
                title="Blog"
                description="Dicas, novidades e tendências do mundo criativo e gestão de projetos."
              />
            }
          />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);