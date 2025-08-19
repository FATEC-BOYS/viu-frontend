import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, X, Save, Archive, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  progress: number;
  deadline: string;
  description?: string;
  budget?: string;
  scope?: string;
  tags?: string[];
}

interface EditProjectModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onProjectUpdate: (project: Project) => void;
  onProjectArchive: (projectId: number) => void;
  onProjectDelete: (projectId: number) => void;
}

export default function EditProjectModal({ 
  project, 
  open, 
  onClose, 
  onProjectUpdate, 
  onProjectArchive, 
  onProjectDelete 
}: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client: "",
    deadline: null as Date | null,
    budget: "",
    scope: "",
    tags: [] as string[],
    status: "",
  });
  const [currentTag, setCurrentTag] = useState("");
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const clients = [
    "Fashion Brand Co.",
    "Tech Startup",
    "Local Restaurant",
    "E-commerce Store",
    "Marketing Agency",
    "Novo Cliente..."
  ];

  const statusOptions = [
    { value: "em-andamento", label: "Em Andamento" },
    { value: "aprovacao", label: "Aguardando Aprovação" },
    { value: "revisao", label: "Em Revisão" },
    { value: "pausado", label: "Pausado" },
    { value: "concluido", label: "Concluído" },
  ];

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        client: project.client || "",
        deadline: project.deadline ? new Date(project.deadline) : null,
        budget: project.budget || "",
        scope: project.scope || "",
        tags: project.tags || [],
        status: project.status || "em-andamento",
      });
      
      // Mock audit log - in real implementation, this would come from the backend
      setAuditLog([
        {
          timestamp: new Date().toISOString(),
          user: "Usuário Atual",
          action: "Projeto visualizado",
        },
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          user: "Ana Silva",
          action: "Prazo alterado para " + format(new Date(project.deadline), "dd/MM/yyyy"),
        },
        {
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          user: "Carlos Lima",
          action: "Descrição atualizada",
        },
      ]);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;

    const updatedProject = {
      ...project,
      ...formData,
      deadline: formData.deadline ? formData.deadline.toISOString() : project.deadline,
      updatedAt: new Date().toISOString(),
    };

    // Add audit log entry
    const newLogEntry = {
      timestamp: new Date().toISOString(),
      user: "Usuário Atual",
      action: "Projeto atualizado",
    };

    onProjectUpdate(updatedProject);
    onClose();
  };

  const handleArchive = () => {
    if (project && confirm("Tem certeza que deseja arquivar este projeto?")) {
      onProjectArchive(project.id);
      onClose();
    }
  };

  const handleDelete = () => {
    if (project && confirm("Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.")) {
      onProjectDelete(project.id);
      onClose();
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
          <DialogDescription>
            Atualize as informações do projeto. Todas as alterações serão registradas no log de auditoria.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Projeto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              {/* Client and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select
                    value={formData.client}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, client: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
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

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
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
              </div>

              {/* Deadline and Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prazo de Entrega *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.deadline ? (
                          format(formData.deadline, "PPP", { locale: ptBR })
                        ) : (
                          "Selecione uma data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.deadline || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, deadline: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Orçamento (R$)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label htmlFor="scope">Escopo</Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Adicionar tag..."
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
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
              </div>
            </form>
          </div>

          {/* Audit Log Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Log de Auditoria</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {auditLog.map((entry, index) => (
                  <div key={index} className="text-xs border-l-2 border-muted pl-3">
                    <p className="font-medium">{entry.action}</p>
                    <p className="text-muted-foreground">{entry.user}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              Arquivar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSubmit} className="bg-gradient-primary hover:opacity-90">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
