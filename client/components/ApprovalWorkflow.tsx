import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  Calendar as CalendarIcon,
  AlertTriangle,
  MessageSquare,
  User,
  FileImage,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ApprovalRequest {
  id: number;
  artId: number;
  artName: string;
  artVersion: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedBy: string;
  requestedAt: string;
  deadline: string;
  message: string;
  clientMessage?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface ApprovalWorkflowProps {
  art: any;
  onRequestApproval: (request: Partial<ApprovalRequest>) => void;
  onApproveArt: (artId: number, comments?: string) => void;
  onRejectArt: (artId: number, reason: string, suggestions?: string) => void;
  userRole: 'designer' | 'client';
  existingRequest?: ApprovalRequest;
}

export default function ApprovalWorkflow({
  art,
  onRequestApproval,
  onApproveArt,
  onRejectArt,
  userRole,
  existingRequest
}: ApprovalWorkflowProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  
  // Request approval form state
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Approval form state
  const [approvalComments, setApprovalComments] = useState("");
  
  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState("");
  const [suggestions, setSuggestions] = useState("");

  const handleRequestApproval = () => {
    if (!deadline || !message.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const request: Partial<ApprovalRequest> = {
      artId: art.id,
      artName: art.name,
      artVersion: art.version,
      deadline: deadline.toISOString(),
      message: message.trim(),
      priority,
      requestedBy: "Designer Atual", // In real app, get from auth context
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    onRequestApproval(request);
    setShowRequestDialog(false);
    
    // Reset form
    setDeadline(null);
    setMessage("");
    setPriority('medium');
  };

  const handleApprove = () => {
    onApproveArt(art.id, approvalComments.trim() || undefined);
    setShowApprovalDialog(false);
    setApprovalComments("");
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert("Por favor, forneça uma justificativa para a rejeição.");
      return;
    }

    onRejectArt(art.id, rejectionReason.trim(), suggestions.trim() || undefined);
    setShowRejectionDialog(false);
    setRejectionReason("");
    setSuggestions("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Aguardando Aprovação';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'expired':
        return 'Expirado';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isDeadlineNear = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours > 0;
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Current Approval Status */}
      {existingRequest && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <FileImage className="w-5 h-5 mr-2" />
                Status da Aprovação
              </CardTitle>
              <Badge variant="secondary" className={getStatusColor(existingRequest.status)}>
                {getStatusLabel(existingRequest.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Solicitado por:</span>
                <p className="font-medium">{existingRequest.requestedBy}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data da solicitação:</span>
                <p className="font-medium">
                  {format(new Date(existingRequest.requestedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Prazo:</span>
                <p className={cn(
                  "font-medium",
                  isOverdue(existingRequest.deadline) ? "text-red-600" : 
                  isDeadlineNear(existingRequest.deadline) ? "text-orange-600" : ""
                )}>
                  {format(new Date(existingRequest.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {isOverdue(existingRequest.deadline) && " (Vencido)"}
                  {isDeadlineNear(existingRequest.deadline) && !isOverdue(existingRequest.deadline) && " (Urgente)"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Arte:</span>
                <p className="font-medium">{existingRequest.artName} ({existingRequest.artVersion})</p>
              </div>
            </div>

            {existingRequest.message && (
              <div>
                <span className="text-muted-foreground text-sm">Mensagem da solicitação:</span>
                <p className="mt-1 p-3 bg-muted/50 rounded text-sm">{existingRequest.message}</p>
              </div>
            )}

            {existingRequest.status === 'approved' && existingRequest.approvedBy && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Aprovado</strong> por {existingRequest.approvedBy} em{" "}
                  {format(new Date(existingRequest.approvedAt!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {existingRequest.clientMessage && (
                    <>
                      <br />
                      <em>"{existingRequest.clientMessage}"</em>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {existingRequest.status === 'rejected' && existingRequest.rejectedBy && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rejeitado</strong> por {existingRequest.rejectedBy} em{" "}
                  {format(new Date(existingRequest.rejectedAt!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  <br />
                  <strong>Motivo:</strong> {existingRequest.rejectionReason}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {userRole === 'designer' && (!existingRequest || existingRequest.status !== 'pending') && (
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Send className="w-4 h-4 mr-2" />
                Solicitar Aprovação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Solicitar Aprovação</DialogTitle>
                <DialogDescription>
                  Envie uma solicitação de aprovação para o cliente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Arte</label>
                  <div className="mt-1 p-3 bg-muted/50 rounded text-sm">
                    {art.name} ({art.version})
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Prazo para Resposta *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline ? (
                          format(deadline, "PPP 'às' HH:mm", { locale: ptBR })
                        ) : (
                          "Selecione data e hora"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={deadline || undefined}
                        onSelect={setDeadline}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Mensagem *</label>
                  <Textarea
                    placeholder="Descreva o que precisa ser aprovado e forneça contexto sobre a arte..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleRequestApproval} className="bg-gradient-primary hover:opacity-90">
                    Enviar Solicitação
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {userRole === 'client' && existingRequest?.status === 'pending' && (
          <>
            <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Aprovar Arte</DialogTitle>
                  <DialogDescription>
                    Confirme a aprovação da arte: {art.name} ({art.version})
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Comentários (opcional)</label>
                    <Textarea
                      placeholder="Adicione comentários sobre a aprovação..."
                      value={approvalComments}
                      onChange={(e) => setApprovalComments(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar Arte
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Rejeitar Arte</DialogTitle>
                  <DialogDescription>
                    Forneça uma justificativa para a rejeição da arte: {art.name} ({art.version})
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Motivo da Rejeição *</label>
                    <Textarea
                      placeholder="Explique por que a arte está sendo rejeitada..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Sugestões de Alteração</label>
                    <Textarea
                      placeholder="Forneça sugestões específicas para melhorar a arte..."
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleReject} variant="destructive">
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar Arte
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
