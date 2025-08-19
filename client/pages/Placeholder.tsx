import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Construction,
  Palette,
  Lightbulb,
  MessageCircle,
} from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
  features?: string[];
  backTo?: string;
}

export default function Placeholder({ 
  title, 
  description, 
  features = [], 
  backTo = "/dashboard" 
}: PlaceholderProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Viu</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link to="/projects" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Projetos
            </Link>
            <Link to="/clients" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Clientes
            </Link>
            <Link to="/reports" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Relatórios
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link to={backTo}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Construction className="w-12 h-12 text-white" />
            </div>
            
            <Badge variant="secondary" className="mb-4">
              Em Desenvolvimento
            </Badge>
            
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              {title}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8">
              {description}
            </p>
          </div>

          {features.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Recursos Planejados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Esta página está sendo desenvolvida e estará disponível em breve.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button className="bg-gradient-primary hover:opacity-90">
                  Ir para Dashboard
                </Button>
              </Link>
              <Button variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Solicitar Recurso
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
