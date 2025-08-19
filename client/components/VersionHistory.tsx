import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  History, 
  Download, 
  Eye, 
  Star, 
  RotateCcw, 
  GitCompare,
  Clock,
  User,
  FileImage,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  CheckCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArtVersion {
  id: number;
  version: string;
  filename: string;
  uploadDate: string;
  uploadedBy: string;
  size: number;
  type: string;
  url: string;
  thumbnail?: string;
  isMainVersion: boolean;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  comments?: string;
  changes?: string[];
}

interface VersionHistoryProps {
  artName: string;
  versions: ArtVersion[];
  onViewVersion: (version: ArtVersion) => void;
  onDownloadVersion: (version: ArtVersion) => void;
  onSetMainVersion: (versionId: number) => void;
  onRestoreVersion: (versionId: number) => void;
  onCompareVersions?: (version1: ArtVersion, version2: ArtVersion) => void;
}

export default function VersionHistory({
  artName,
  versions,
  onViewVersion,
  onDownloadVersion,
  onSetMainVersion,
  onRestoreVersion,
  onCompareVersions
}: VersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<Set<number>>(new Set());

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );

  const toggleExpanded = (versionId: number) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const toggleSelected = (versionId: number) => {
    const newSelected = new Set(selectedVersions);
    if (newSelected.has(versionId)) {
      newSelected.delete(versionId);
    } else {
      // Limit to 2 selections for comparison
      if (newSelected.size >= 2) {
        newSelected.clear();
      }
      newSelected.add(versionId);
    }
    setSelectedVersions(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'review':
        return 'bg-orange-100 text-orange-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'review':
        return 'Em Revisão';
      case 'draft':
        return 'Rascunho';
      default:
        return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCompareSelected = () => {
    if (selectedVersions.size === 2 && onCompareVersions) {
      const selectedArray = Array.from(selectedVersions);
      const version1 = versions.find(v => v.id === selectedArray[0]);
      const version2 = versions.find(v => v.id === selectedArray[1]);
      if (version1 && version2) {
        onCompareVersions(version1, version2);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          Histórico ({versions.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Histórico de Versões - {artName}
          </DialogTitle>
          <DialogDescription>
            Visualize, compare e gerencie todas as versões deste arquivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-2">
              {selectedVersions.size > 0 && (
                <Badge variant="secondary">
                  {selectedVersions.size} selecionada{selectedVersions.size > 1 ? 's' : ''}
                </Badge>
              )}
              {selectedVersions.size === 2 && onCompareVersions && (
                <Button size="sm" onClick={handleCompareSelected}>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Comparar Versões
                </Button>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {versions.length} versão{versions.length > 1 ? 'ões' : ''} • 
              Mais recente: {format(new Date(sortedVersions[0]?.uploadDate || ''), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>

          {/* Version List */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {sortedVersions.map((version, index) => {
              const isExpanded = expandedVersions.has(version.id);
              const isSelected = selectedVersions.has(version.id);
              const isLatest = index === 0;
              
              return (
                <Card key={version.id} className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {/* Thumbnail/Icon */}
                        <div className="flex-shrink-0">
                          {version.thumbnail ? (
                            <img 
                              src={version.thumbnail} 
                              alt={version.filename}
                              className="w-12 h-12 object-cover rounded border cursor-pointer"
                              onClick={() => onViewVersion(version)}
                            />
                          ) : (
                            <div 
                              className="w-12 h-12 bg-muted rounded border flex items-center justify-center cursor-pointer hover:bg-muted/80"
                              onClick={() => onViewVersion(version)}
                            >
                              <FileImage className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Version Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold">{version.version}</h4>
                            {version.isMainVersion && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <Star className="w-3 h-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                            {isLatest && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Mais Recente
                              </Badge>
                            )}
                            <Badge variant="secondary" className={getStatusColor(version.status)}>
                              {getStatusLabel(version.status)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            {version.filename}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDistanceToNow(new Date(version.uploadDate), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </div>
                            <div className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {version.uploadedBy}
                            </div>
                            <span>{formatFileSize(version.size)}</span>
                            <span>{version.type}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(version.id)}
                          className="rounded border-muted-foreground"
                        />
                        
                        <Button variant="ghost" size="sm" onClick={() => onViewVersion(version)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button variant="ghost" size="sm" onClick={() => onDownloadVersion(version)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        {!version.isMainVersion && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onSetMainVersion(version.id)}
                            title="Definir como versão principal"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {!isLatest && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onRestoreVersion(version.id)}
                            title="Restaurar esta versão"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleExpanded(version.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <CardContent className="pt-0 border-t">
                      <div className="space-y-3">
                        {/* Upload Details */}
                        <div>
                          <h5 className="font-medium text-sm mb-2">Detalhes do Upload</h5>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Data de Upload:</span>
                              <p>{format(new Date(version.uploadDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Enviado por:</span>
                              <div className="flex items-center space-x-2 mt-1">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">
                                    {version.uploadedBy.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{version.uploadedBy}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comments */}
                        {version.comments && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Comentários</h5>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                              {version.comments}
                            </p>
                          </div>
                        )}

                        {/* Changes */}
                        {version.changes && version.changes.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Alterações</h5>
                            <div className="space-y-1">
                              {version.changes.map((change, idx) => (
                                <div key={idx} className="flex items-start space-x-2 text-sm">
                                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{change}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions for expanded view */}
                        <div className="flex items-center space-x-2 pt-2 border-t">
                          <Button size="sm" variant="outline" onClick={() => onViewVersion(version)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onDownloadVersion(version)}>
                            <Download className="w-4 h-4 mr-2" />
                            Baixar
                          </Button>
                          {!version.isMainVersion && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => onSetMainVersion(version.id)}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Definir como Principal
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
            <div>
              Dica: Selecione até 2 versões para comparação
            </div>
            <div>
              Total: {formatFileSize(versions.reduce((total, v) => total + v.size, 0))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
