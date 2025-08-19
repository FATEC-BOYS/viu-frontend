import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon,
  Download, 
  FileSpreadsheet,
  FileText,
  Printer,
  Filter,
  RefreshCw,
  Users,
  Clock,
  Star,
  CheckCircle,
  MessageSquare,
  DollarSign,
  Activity,
  Zap,
  Target,
  Award,
  Palette,
  Bell,
  MoreHorizontal,
  Eye,
  Share
} from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProductivityMetrics {
  projectsCompleted: number;
  averageProjectTime: number; // in days
  firstTimeApprovalRate: number; // percentage
  revenue: number;
  clientSatisfaction: number;
  responseTime: number; // in hours
  period: string;
  previousPeriod: {
    projectsCompleted: number;
    averageProjectTime: number;
    firstTimeApprovalRate: number;
    revenue: number;
    clientSatisfaction: number;
    responseTime: number;
  };
}

interface ClientAnalytics {
  id: number;
  name: string;
  company: string;
  projectsCount: number;
  totalRevenue: number;
  averageResponseTime: number;
  satisfactionScore: number;
  lastProject: string;
  communicationFrequency: number; // messages per project
  feedbackQuality: 'excellent' | 'good' | 'average' | 'poor';
  retentionProbability: number; // percentage
}

interface ProjectPerformance {
  month: string;
  completed: number;
  inProgress: number;
  revenue: number;
  satisfaction: number;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<{from: Date | null, to: Date | null}>({
    from: subMonths(new Date(), 1),
    to: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState("last30days");
  const [selectedMetric, setSelectedMetric] = useState("all");
  const [selectedExportFormat, setSelectedExportFormat] = useState("pdf");

  // Mock data - in real app, this would come from API
  const productivityData: ProductivityMetrics = {
    projectsCompleted: 12,
    averageProjectTime: 14,
    firstTimeApprovalRate: 78,
    revenue: 156000,
    clientSatisfaction: 4.7,
    responseTime: 3.2,
    period: "Últimos 30 dias",
    previousPeriod: {
      projectsCompleted: 8,
      averageProjectTime: 18,
      firstTimeApprovalRate: 65,
      revenue: 124000,
      clientSatisfaction: 4.4,
      responseTime: 4.1,
    }
  };

  const clientAnalytics: ClientAnalytics[] = [
    {
      id: 1,
      name: "Maria Santos",
      company: "Fashion Brand Co.",
      projectsCount: 8,
      totalRevenue: 85000,
      averageResponseTime: 2.5,
      satisfactionScore: 4.9,
      lastProject: "2024-01-28",
      communicationFrequency: 12,
      feedbackQuality: "excellent",
      retentionProbability: 95,
    },
    {
      id: 2,
      name: "João Costa",
      company: "Tech Startup",
      projectsCount: 5,
      totalRevenue: 45000,
      averageResponseTime: 1.8,
      satisfactionScore: 4.8,
      lastProject: "2024-01-25",
      communicationFrequency: 8,
      feedbackQuality: "excellent",
      retentionProbability: 92,
    },
    {
      id: 3,
      name: "Ana Silva",
      company: "Local Restaurant",
      projectsCount: 3,
      totalRevenue: 18000,
      averageResponseTime: 6.2,
      satisfactionScore: 4.1,
      lastProject: "2024-01-20",
      communicationFrequency: 15,
      feedbackQuality: "good",
      retentionProbability: 75,
    },
  ];

  const projectPerformance: ProjectPerformance[] = [
    { month: "Out", completed: 8, inProgress: 3, revenue: 95000, satisfaction: 4.5 },
    { month: "Nov", completed: 10, inProgress: 4, revenue: 120000, satisfaction: 4.6 },
    { month: "Dez", completed: 12, inProgress: 5, revenue: 140000, satisfaction: 4.7 },
    { month: "Jan", completed: 15, inProgress: 6, revenue: 156000, satisfaction: 4.7 },
  ];

  const getChangeIndicator = (current: number, previous: number, isPercentage = false, reverse = false) => {
    const change = ((current - previous) / previous) * 100;
    const isPositive = reverse ? change < 0 : change > 0;
    const formatted = isPercentage ? 
      `${Math.abs(change).toFixed(1)}pp` : 
      `${Math.abs(change).toFixed(1)}%`;

    return {
      value: formatted,
      isPositive,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? "text-green-600" : "text-red-600"
    };
  };

  const getFeedbackQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRetentionColor = (probability: number) => {
    if (probability >= 90) return "text-green-600";
    if (probability >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const handleExport = (format: string, type: string) => {
    // In a real app, this would trigger the actual export
    console.log(`Exporting ${type} data as ${format}`);
    
    // Simulate file generation
    const fileName = `Viu-${type}-${format}-${format(new Date(), 'yyyy-MM-dd')}`;
    alert(`Arquivo ${fileName} será baixado em breve.`);
  };

  const generateReport = () => {
    // In a real app, this would generate a comprehensive report
    console.log("Generating comprehensive report...");
    alert("Relatório completo será gerado e enviado por e-mail.");
  };

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
            <Link to="/reports" className="text-sm font-medium text-foreground">
              Relatórios
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-muted rounded-full" />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Relatórios e Análises</h1>
            <p className="text-muted-foreground">
              Analise sua produtividade, desempenho de clientes e métricas de negócio
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            {/* Period Selector */}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Últimos 7 dias</SelectItem>
                <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                <SelectItem value="last3months">Últimos 3 meses</SelectItem>
                <SelectItem value="last6months">Últimos 6 meses</SelectItem>
                <SelectItem value="lastyear">Último ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            {selectedPeriod === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-60 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      "Selecionar período"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.from || undefined,
                      to: dateRange.to || undefined,
                    }}
                    onSelect={(range) => setDateRange({
                      from: range?.from || null,
                      to: range?.to || null,
                    })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            <Button onClick={generateReport} className="bg-gradient-primary hover:opacity-90">
              <BarChart3 className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </div>

        <Tabs defaultValue="productivity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="productivity">Produtividade</TabsTrigger>
            <TabsTrigger value="clients">Análise de Clientes</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="productivity" className="space-y-6">
            {/* Productivity Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projetos Concluídos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productivityData.projectsCompleted}</div>
                  <div className="flex items-center text-xs">
                    {(() => {
                      const indicator = getChangeIndicator(
                        productivityData.projectsCompleted, 
                        productivityData.previousPeriod.projectsCompleted
                      );
                      return (
                        <>
                          <indicator.icon className={cn("w-3 h-3 mr-1", indicator.color)} />
                          <span className={indicator.color}>{indicator.value}</span>
                          <span className="text-muted-foreground ml-1">vs. período anterior</span>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tempo Médio por Projeto</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productivityData.averageProjectTime} dias</div>
                  <div className="flex items-center text-xs">
                    {(() => {
                      const indicator = getChangeIndicator(
                        productivityData.averageProjectTime, 
                        productivityData.previousPeriod.averageProjectTime,
                        false,
                        true // reverse because lower is better
                      );
                      return (
                        <>
                          <indicator.icon className={cn("w-3 h-3 mr-1", indicator.color)} />
                          <span className={indicator.color}>{indicator.value}</span>
                          <span className="text-muted-foreground ml-1">vs. período anterior</span>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productivityData.firstTimeApprovalRate}%</div>
                  <div className="flex items-center text-xs">
                    {(() => {
                      const indicator = getChangeIndicator(
                        productivityData.firstTimeApprovalRate, 
                        productivityData.previousPeriod.firstTimeApprovalRate,
                        true
                      );
                      return (
                        <>
                          <indicator.icon className={cn("w-3 h-3 mr-1", indicator.color)} />
                          <span className={indicator.color}>{indicator.value}</span>
                          <span className="text-muted-foreground ml-1">vs. período anterior</span>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Gerada</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {productivityData.revenue.toLocaleString('pt-BR')}
                  </div>
                  <div className="flex items-center text-xs">
                    {(() => {
                      const indicator = getChangeIndicator(
                        productivityData.revenue, 
                        productivityData.previousPeriod.revenue
                      );
                      return (
                        <>
                          <indicator.icon className={cn("w-3 h-3 mr-1", indicator.color)} />
                          <span className={indicator.color}>{indicator.value}</span>
                          <span className="text-muted-foreground ml-1">vs. período anterior</span>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Satisfação dos Clientes</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productivityData.clientSatisfaction}/5</div>
                  <div className="flex items-center text-xs">
                    {(() => {
                      const indicator = getChangeIndicator(
                        productivityData.clientSatisfaction, 
                        productivityData.previousPeriod.clientSatisfaction
                      );
                      return (
                        <>
                          <indicator.icon className={cn("w-3 h-3 mr-1", indicator.color)} />
                          <span className={indicator.color}>{indicator.value}</span>
                          <span className="text-muted-foreground ml-1">vs. período anterior</span>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productivityData.responseTime}h</div>
                  <div className="flex items-center text-xs">
                    {(() => {
                      const indicator = getChangeIndicator(
                        productivityData.responseTime, 
                        productivityData.previousPeriod.responseTime,
                        false,
                        true // reverse because lower is better
                      );
                      return (
                        <>
                          <indicator.icon className={cn("w-3 h-3 mr-1", indicator.color)} />
                          <span className={indicator.color}>{indicator.value}</span>
                          <span className="text-muted-foreground ml-1">vs. período anterior</span>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Performance por Período</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel', 'productivity')}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf', 'productivity')}>
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Gráfico de Performance</h3>
                    <p className="text-muted-foreground">
                      Gráfico interativo com dados de produtividade seria renderizado aqui
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            {/* Client Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientAnalytics.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Média de {(clientAnalytics.reduce((sum, c) => sum + c.projectsCount, 0) / clientAnalytics.length).toFixed(1)} projetos por cliente
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Retenção Média</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(clientAnalytics.reduce((sum, c) => sum + c.retentionProbability, 0) / clientAnalytics.length)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Probabilidade de manter clientes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita por Cliente</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {Math.round(clientAnalytics.reduce((sum, c) => sum + c.totalRevenue, 0) / clientAnalytics.length).toLocaleString('pt-BR')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor médio por cliente
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Client Details Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Análise Detalhada de Clientes</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtros
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel', 'clients')}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientAnalytics.map((client) => (
                    <div key={client.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{client.name}</h3>
                          <p className="text-sm text-muted-foreground">{client.company}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className={getFeedbackQualityColor(client.feedbackQuality)}>
                            {client.feedbackQuality === 'excellent' ? 'Excelente' :
                             client.feedbackQuality === 'good' ? 'Bom' :
                             client.feedbackQuality === 'average' ? 'Médio' : 'Ruim'}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Projetos:</span>
                          <p className="font-medium">{client.projectsCount}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Receita:</span>
                          <p className="font-medium">R$ {client.totalRevenue.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Resposta:</span>
                          <p className="font-medium">{client.averageResponseTime}h</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Satisfação:</span>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                            <span className="font-medium">{client.satisfactionScore}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Retenção:</span>
                          <p className={cn("font-medium", getRetentionColor(client.retentionProbability))}>
                            {client.retentionProbability}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Probabilidade de Retenção</span>
                          <span>{client.retentionProbability}%</span>
                        </div>
                        <Progress value={client.retentionProbability} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projetos Este Mês</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">15</div>
                  <p className="text-xs text-muted-foreground">
                    +3 vs. mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">6</div>
                  <p className="text-xs text-muted-foreground">
                    Diversos estágios
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ 156k</div>
                  <p className="text-xs text-muted-foreground">
                    +12% vs. mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.7</div>
                  <p className="text-xs text-muted-foreground">
                    Média de avaliações
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Performance por Mês</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as métricas</SelectItem>
                        <SelectItem value="projects">Projetos</SelectItem>
                        <SelectItem value="revenue">Receita</SelectItem>
                        <SelectItem value="satisfaction">Satisfação</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf', 'performance')}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectPerformance.map((period, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <CalendarIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{period.month} 2024</h3>
                          <p className="text-sm text-muted-foreground">
                            {period.completed} concluídos • {period.inProgress} em andamento
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Receita</p>
                          <p className="font-semibold">R$ {(period.revenue / 1000).toFixed(0)}k</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Satisfação</p>
                          <div className="flex items-center justify-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                            <span className="font-semibold">{period.satisfaction}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="font-semibold">{period.completed + period.inProgress}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Exportação de Dados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Formato de Exportação</h4>
                    <Select value={selectedExportFormat} onValueChange={setSelectedExportFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Relatórios Rápidos</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleExport(selectedExportFormat, 'productivity')}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Produtividade
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleExport(selectedExportFormat, 'clients')}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Clientes
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleExport(selectedExportFormat, 'financial')}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Financeiro
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Relatório Completo</h4>
                    <Button 
                      onClick={generateReport}
                      className="w-full bg-gradient-primary hover:opacity-90"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Gerar Relatório Completo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Inclui todas as métricas, gráficos e análises detalhadas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
