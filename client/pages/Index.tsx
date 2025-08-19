import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  MessageSquare,
  BarChart3,
  Bell,
  Palette,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Play,
  Mic,
  FileImage,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

export default function Index() {
  const features = [
    {
      icon: Upload,
      title: "Upload & Aprovação de Artes",
      description: "Sistema estruturado para upload, visualização e aprovação de trabalhos criativos com comentários organizados.",
    },
    {
      icon: MessageSquare,
      title: "Feedback Multimodal",
      description: "Aceita comentários por texto e áudio com transcrição automática para facilitar organização e busca.",
    },
    {
      icon: BarChart3,
      title: "Dashboard Centralizado",
      description: "Visualize todos os projetos, prazos, feedbacks pendentes e status de aprovações em uma interface.",
    },
    {
      icon: Bell,
      title: "Notificações Inteligentes",
      description: "Mantenha todas as partes informadas sobre atualizações, novos feedbacks e prazos próximos.",
    },
    {
      icon: Palette,
      title: "Integração com Ferramentas",
      description: "Conecte-se com Adobe Creative Suite, Figma, Canva e outras ferramentas populares de design.",
    },
    {
      icon: Users,
      title: "Relatórios Analíticos",
      description: "Analise produtividade, tempo por projeto e satisfação dos clientes com relatórios detalhados.",
    },
  ];

  const stats = [
    { value: "98%", label: "Satisfação dos Clientes" },
    { value: "65%", label: "Redução no Tempo de Aprovação" },
    { value: "40%", label: "Aumento na Produtividade" },
    { value: "24/7", label: "Suporte Disponível" },
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Economize Tempo",
      description: "Reduza drasticamente o tempo gasto em revisões e aprovações",
    },
    {
      icon: CheckCircle,
      title: "Aumente a Qualidade",
      description: "Feedbacks estruturados levam a trabalhos mais refinados",
    },
    {
      icon: Zap,
      title: "Melhore a Eficiência",
      description: "Centralize toda comunicação e elimine retrabalhos",
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description: "Seus projetos protegidos com criptografia de ponta",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Viu</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sobre
            </Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contato
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                Começar Agora
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <Badge variant="secondary" className="mb-6">
              <Globe className="w-3 h-3 mr-1" />
              Plataforma SaaS Completa
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Gerencie Projetos Criativos de{" "}
              <span className="text-gradient">Forma Inteligente</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Centralize a comunicação entre designers e clientes, otimize aprovações de artes 
              e organize tarefas para máxima produtividade e satisfação.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8">
                <Play className="mr-2 w-5 h-5" />
                Ver Demo
              </Button>
            </div>
          </div>
        </div>
        
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/20 via-transparent to-transparent opacity-60" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-3xl lg:text-4xl font-bold text-gradient mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Recursos <span className="text-gradient">Poderosos</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar projetos criativos com efici��ncia máxima
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Por que escolher <span className="text-gradient">Viu?</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-primary rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Pronto para Transformar seus Projetos?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de designers e clientes que já estão usando o Viu 
              para projetos mais eficientes e organizados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Começar Agora Gratuitamente
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent border-white text-white hover:bg-white hover:text-primary">
                Falar com Vendas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gradient">Viu</span>
              </div>
              <p className="text-muted-foreground text-sm">
                A plataforma completa para gestão de projetos criativos.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link to="/features" className="block hover:text-foreground">Recursos</Link>
                <Link to="/pricing" className="block hover:text-foreground">Preços</Link>
                <Link to="/integrations" className="block hover:text-foreground">Integrações</Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link to="/help" className="block hover:text-foreground">Central de Ajuda</Link>
                <Link to="/contact" className="block hover:text-foreground">Contato</Link>
                <Link to="/docs" className="block hover:text-foreground">Documentação</Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link to="/about" className="block hover:text-foreground">Sobre Nós</Link>
                <Link to="/careers" className="block hover:text-foreground">Carreiras</Link>
                <Link to="/blog" className="block hover:text-foreground">Blog</Link>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 Viu. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
