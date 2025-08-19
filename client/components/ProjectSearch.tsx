import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  X, 
  CalendarIcon, 
  SlidersHorizontal,
  Plus,
  Minus
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SearchFilters {
  keyword: string;
  client: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  tags: string[];
  budget: {
    min: string;
    max: string;
  };
}

interface ProjectSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClearFilters: () => void;
}

export default function ProjectSearch({ onSearch, onClearFilters }: ProjectSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    client: "",
    status: "",
    startDate: null,
    endDate: null,
    tags: [],
    budget: { min: "", max: "" },
  });
  const [currentTag, setCurrentTag] = useState("");

  const clients = [
    "Todos os clientes",
    "Fashion Brand Co.",
    "Tech Startup",
    "Local Restaurant",
    "E-commerce Store",
    "Marketing Agency",
  ];

  const statusOptions = [
    { value: "", label: "Todos os status" },
    { value: "em-andamento", label: "Em Andamento" },
    { value: "aprovacao", label: "Aguardando Aprovação" },
    { value: "revisao", label: "Em Revisão" },
    { value: "pausado", label: "Pausado" },
    { value: "concluido", label: "Concluído" },
    { value: "arquivado", label: "Arquivado" },
  ];

  const commonTags = [
    "Branding",
    "Social Media",
    "Print",
    "Web Design",
    "Campanha",
    "Logo",
    "Website",
    "E-commerce",
    "Mobile",
    "UX/UI"
  ];

  const handleSearch = () => {
    onSearch(filters);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    const clearedFilters = {
      keyword: "",
      client: "",
      status: "",
      startDate: null,
      endDate: null,
      tags: [],
      budget: { min: "", max: "" },
    };
    setFilters(clearedFilters);
    onClearFilters();
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const addCustomTag = () => {
    if (currentTag.trim() && !filters.tags.includes(currentTag.trim())) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const hasActiveFilters = filters.keyword || filters.client || filters.status || 
    filters.startDate || filters.endDate || filters.tags.length > 0 || 
    filters.budget.min || filters.budget.max;

  return (
    <div className="flex items-center gap-2">
      {/* Quick Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar projetos..."
          value={filters.keyword}
          onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-10"
        />
      </div>

      {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-96 p-6" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filtros Avançados</h4>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Limpar Tudo
              </Button>
            </div>

            {/* Client Filter */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={filters.client}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  client: value === "Todos os clientes" ? "" : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Período</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? (
                        format(filters.startDate, "dd/MM", { locale: ptBR })
                      ) : (
                        "Início"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate || undefined}
                      onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? (
                        format(filters.endDate, "dd/MM", { locale: ptBR })
                      ) : (
                        "Fim"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate || undefined}
                      onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date || null }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Budget Range */}
            <div className="space-y-2">
              <Label>Orçamento (R$)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Mín."
                  value={filters.budget.min}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    budget: { ...prev.budget, min: e.target.value }
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Máx."
                  value={filters.budget.max}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    budget: { ...prev.budget, max: e.target.value }
                  }))}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              
              {/* Selected Tags */}
              {filters.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {filters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Common Tags */}
              <div className="flex flex-wrap gap-1 mb-2">
                {commonTags.filter(tag => !filters.tags.includes(tag)).map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tag)}
                    className="h-6 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Tag personalizada..."
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                  className="flex-1"
                />
                <Button type="button" onClick={addCustomTag} variant="outline" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSearch} className="flex-1 bg-gradient-primary hover:opacity-90">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick Search Button */}
      <Button onClick={handleSearch} size="sm" className="bg-gradient-primary hover:opacity-90">
        <Search className="w-4 h-4" />
      </Button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
