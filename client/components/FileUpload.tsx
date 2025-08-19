import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  X, 
  FileImage, 
  FileText, 
  Video, 
  File,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  progress?: number;
  status?: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface FileUploadProps {
  onFilesUpload: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  multiple?: boolean;
  projectId?: number;
}

export default function FileUpload({ 
  onFilesUpload, 
  maxFiles = 10, 
  maxSize = 100, 
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4', 'video/quicktime'],
  multiple = true,
  projectId 
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return FileImage;
    if (type.startsWith('video/')) return Video;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return { isValid: false, error: `Arquivo muito grande. Máximo: ${maxSize}MB` };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Tipo de arquivo não suportado' };
    }

    return { isValid: true };
  };

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: FileWithPreview[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateFile(file);
      
      const fileWithPreview: FileWithPreview = {
        ...file,
        id: `${Date.now()}-${i}`,
        status: validation.isValid ? 'uploading' : 'error',
        errorMessage: validation.error,
        progress: 0,
      };

      // Create preview for images
      if (file.type.startsWith('image/') && validation.isValid) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileWithPreview.preview = e.target?.result as string;
          setFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(fileWithPreview);
    }

    // Check total files limit
    if (files.length + newFiles.length > maxFiles) {
      alert(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
    
    // Start upload simulation for valid files
    newFiles.forEach(file => {
      if (file.status === 'uploading') {
        simulateUpload(file.id);
      }
    });
  }, [files, maxFiles, maxSize, allowedTypes]);

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      
      setFiles(prev => prev.map(file => 
        file.id === fileId 
          ? { ...file, progress: Math.min(progress, 100) }
          : file
      ));

      if (progress >= 100) {
        clearInterval(interval);
        setFiles(prev => prev.map(file => 
          file.id === fileId 
            ? { ...file, status: 'success', progress: 100 }
            : file
        ));
      }
    }, 200);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleUploadAll = async () => {
    const validFiles = files.filter(file => file.status === 'success');
    if (validFiles.length === 0) return;

    setIsUploading(true);
    
    // Simulate API call
    setTimeout(() => {
      onFilesUpload(validFiles);
      setFiles([]);
      setIsUploading(false);
    }, 1000);
  };

  const uploadedFilesCount = files.filter(f => f.status === 'success').length;
  const hasErrors = files.some(f => f.status === 'error');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          "hover:border-primary hover:bg-primary/5"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">
              Arraste arquivos aqui ou clique para selecionar
            </h3>
            <p className="text-sm text-muted-foreground">
              Suporta: JPG, PNG, PDF, AI, PSD, MP4, MOV (máx. {maxSize}MB)
            </p>
          </div>
          <input
            id="file-input"
            type="file"
            multiple={multiple}
            accept={allowedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              Arquivos ({files.length}/{maxFiles})
            </h4>
            {uploadedFilesCount > 0 && (
              <Button 
                onClick={handleUploadAll}
                disabled={isUploading || uploadedFilesCount === 0}
                className="bg-gradient-primary hover:opacity-90"
                size="sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Todos ({uploadedFilesCount})
                  </>
                )}
              </Button>
            )}
          </div>

          {hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Alguns arquivos não puderam ser processados. Verifique os erros abaixo.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type);
              
              return (
                <Card key={file.id} className={cn(
                  "transition-all",
                  file.status === 'error' && "border-destructive"
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      {/* File Preview/Icon */}
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img 
                            src={file.preview} 
                            alt={file.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <FileIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center space-x-2">
                            {file.status === 'success' && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Pronto
                              </Badge>
                            )}
                            {file.status === 'error' && (
                              <Badge variant="destructive">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{file.type}</span>
                        </div>

                        {/* Progress Bar */}
                        {file.status === 'uploading' && typeof file.progress === 'number' && (
                          <div className="mt-2">
                            <Progress value={file.progress} className="h-1" />
                          </div>
                        )}

                        {/* Error Message */}
                        {file.status === 'error' && file.errorMessage && (
                          <p className="text-xs text-destructive mt-1">{file.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
